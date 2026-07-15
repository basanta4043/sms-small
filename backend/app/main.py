import os
from pathlib import Path
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import FileResponse, HTMLResponse, RedirectResponse, Response

from app.auth import create_access_token, decode_access_token, hash_password, verify_password
from app.database import (
    create_exam_for_user,
    create_fee_structure_for_user,
    create_or_update_result_for_user,
    create_payment_and_invoice,
    create_school_for_user,
    create_student_for_user,
    create_user,
    delete_exam_for_user,
    delete_fee_structure_for_user,
    delete_student_for_user,
    get_exam_by_id_for_user,
    get_exams_for_user,
    get_fee_structures_for_user,
    get_invoices_for_user,
    get_payments_for_user,
    get_result_for_user,
    get_results_for_user,
    get_school_for_user,
    get_students_for_user,
    get_user_by_id,
    get_user_by_username,
    init_schema,
    update_exam_for_user,
    update_fee_structure_for_user,
    update_school_for_user,
    update_student_for_user,
)

app = FastAPI(title="School Manager API")

class CloudflareProxyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Read the protocol header forwarded by Cloudflare
        forwarded_proto = request.headers.get("x-forwarded-proto")
        if forwarded_proto:
            # Force FastAPI's internal routing engine to use 'https'
            request.scope["scheme"] = forwarded_proto
        return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CloudflareProxyMiddleware)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DIST_DIR = PROJECT_ROOT / "dist"
INDEX_HTML = DIST_DIR / "index.html"

if DIST_DIR.exists():
    # Mount only the assets directory to serve JS/CSS with correct MIME types.
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
async def redirect_api_prefix(request: Request, path: str) -> RedirectResponse:
    stripped_path = f"/{path}" if path else "/"
    target = request.url.replace(path=stripped_path)
    return RedirectResponse(url=str(target), status_code=307)


class RegisterPayload(BaseModel):
    username: str
    password: str
    school_name: str = ""


class LoginPayload(BaseModel):
    username: str
    password: str


class FeeStructurePayload(BaseModel):
    class_name: str
    items: list[dict[str, Any]]
    total: float


class PaymentPayload(BaseModel):
    student_id: int
    amount: float
    method: str
    note: str | None = None
    date: str


class StudentPayload(BaseModel):
    roll_no: str | None = None
    name: str
    class_name: str | None = None
    section: str | None = None
    gender: str | None = None
    dob: str | None = None
    guardian_name: str | None = None
    phone: str | None = None
    address: str | None = None
    admission_date: str | None = None
    status: str | None = None


class SchoolPayload(BaseModel):
    name: str | None = None
    address: str | None = None
    currency: str | None = None
    logo_url: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None


class ExamPayload(BaseModel):
    name: str
    term: str | None = None
    class_name: str | None = None
    subjects: list[dict[str, Any]]


class ResultPayload(BaseModel):
    exam_id: int
    student_id: int
    marks: list[dict[str, Any]]


def _grade_for_percentage(pct: float) -> dict[str, Any]:
    if pct >= 90:
        return {"grade": "A+", "remark": "Outstanding"}
    if pct >= 80:
        return {"grade": "A", "remark": "Excellent"}
    if pct >= 70:
        return {"grade": "B+", "remark": "Very Good"}
    if pct >= 60:
        return {"grade": "B", "remark": "Good"}
    if pct >= 50:
        return {"grade": "C+", "remark": "Satisfactory"}
    if pct >= 40:
        return {"grade": "C", "remark": "Fair"}
    if pct >= 33:
        return {"grade": "D", "remark": "Needs Improvement"}
    return {"grade": "F", "remark": "Fail"}


def _build_gradesheet_report(exam: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    exam_subjects = exam.get("subjects", []) or []
    rows = []
    for subject in exam_subjects:
        mark_row = next((item for item in result.get("marks", []) if str(item.get("subject", "")).lower() == str(subject.get("name", "")).lower()), None)
        obtained = float(mark_row.get("obtained", 0) or 0) if mark_row else 0.0
        max_marks = float(subject.get("maxMarks", 0) or 0)
        pct = (obtained / max_marks * 100) if max_marks else 0.0
        grade_info = _grade_for_percentage(pct)
        rows.append(
            {
                "subject": subject.get("name"),
                "maxMarks": max_marks,
                "obtained": obtained,
                "pct": round(pct, 1),
                "grade": grade_info["grade"],
                "pass": obtained >= float(subject.get("passMarks", 0) or 0),
            }
        )
    total_max = sum(float(item.get("maxMarks", 0) or 0) for item in rows)
    total_obtained = sum(float(item.get("obtained", 0) or 0) for item in rows)
    overall_pct = (total_obtained / total_max * 100) if total_max else 0.0
    overall_info = _grade_for_percentage(overall_pct)
    all_pass = all(item["pass"] for item in rows)
    return {
        "rows": rows,
        "totalMax": total_max,
        "totalObtained": total_obtained,
        "overallPct": round(overall_pct, 1),
        "overall": {"grade": overall_info["grade"], "remark": overall_info["remark"]},
        "allPass": all_pass,
    }


@app.on_event("startup")
def startup_event() -> None:
    try:
        init_schema()
    except Exception as exc:  # pragma: no cover - best effort startup
        print(f"Database initialization skipped: {exc}")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def serve_frontend() -> Response:
    if INDEX_HTML.exists():
        return FileResponse(INDEX_HTML)
    return HTMLResponse("<!doctype html><html><body><h1>School Manager</h1><p>Frontend build not found.</p></body></html>")





@app.post("/auth/register")
def register(payload: RegisterPayload) -> dict[str, object]:
    username = payload.username.strip()
    school_name = payload.school_name.strip()
    if not username or len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="Username and a password of at least 4 characters are required")

    if get_user_by_username(username):
        raise HTTPException(status_code=409, detail="Username already exists")

    user = create_user(username=username, password_hash=hash_password(payload.password), school_name=school_name)
    school = get_school_for_user(user["id"]) or {"name": school_name, "address": None, "currency": "Rs.", "logo_url": None, "phone": None, "email": None, "website": None}
    token = create_access_token(str(user["id"]))
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "school_name": user["school_name"],
        },
        "school": school,
    }


@app.post("/auth/login")
def login(payload: LoginPayload) -> dict[str, object]:
    username = payload.username.strip()
    user = get_user_by_username(username)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    school = get_school_for_user(user["id"]) or {"name": user.get("school_name", ""), "address": None, "currency": "Rs.", "logo_url": None, "phone": None, "email": None, "website": None}
    token = create_access_token(str(user["id"]))
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "school_name": user["school_name"],
        },
        "school": school,
    }


# Fallback for SPA routes (GET only). Keep after API routes so it doesn't
# intercept `/api/...` POST/PUT requests. It will serve `index.html` for
# browser navigation paths like `/login` or `/dashboard`.
@app.get("/{path:path}", include_in_schema=False)
def spa_fallback(path: str, request: Request) -> Response:
    # Do not handle API or assets paths here
    if path.startswith("api") or path.startswith("assets"):
        raise HTTPException(status_code=404)
    if INDEX_HTML.exists():
        return FileResponse(INDEX_HTML)
    return HTMLResponse("<!doctype html><html><body><h1>School Manager</h1><p>Frontend build not found.</p></body></html>")


def get_current_user(authorization: Annotated[str | None, Header()] = None) -> dict[str, object]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid token format")

    try:
        payload = decode_access_token(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    user = get_user_by_id(payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.get("/auth/me")
def me(user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    school = get_school_for_user(user["id"]) or {"name": user.get("school_name", ""), "address": None, "currency": "Rs.", "logo_url": None, "phone": None, "email": None, "website": None}
    return {"user": user, "school": school}


@app.get("/schools/me")
def get_school(user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    school = get_school_for_user(user["id"]) or {"name": user.get("school_name", ""), "address": None, "currency": "Rs.", "logo_url": None, "phone": None, "email": None, "website": None}
    return {"school": school}


@app.put("/schools/me")
def update_school(payload: SchoolPayload, user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    school = update_school_for_user(user["id"], payload.model_dump(exclude_none=True))
    return {"school": school}


@app.get("/fees/structures")
def list_fee_structures(user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    return {"feeStructures": get_fee_structures_for_user(user["id"])}


@app.post("/fees/structures")
def create_fee_structure(payload: FeeStructurePayload, user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    structure = create_fee_structure_for_user(user["id"], payload.model_dump())
    return {"feeStructure": structure}


@app.put("/fees/structures/{structure_id}")
def update_fee_structure(structure_id: int, payload: FeeStructurePayload, user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    structure = update_fee_structure_for_user(user["id"], structure_id, payload.model_dump())
    if not structure:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    return {"feeStructure": structure}


@app.delete("/fees/structures/{structure_id}")
def delete_fee_structure(structure_id: int, user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    deleted = delete_fee_structure_for_user(user["id"], structure_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    return {"deleted": True}


@app.get("/fees/payments")
def list_payments(user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    return {"payments": get_payments_for_user(user["id"])}


@app.get("/fees/invoices")
def list_invoices(user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    return {"invoices": get_invoices_for_user(user["id"])}


@app.post("/fees/payments")
def collect_fee(payload: PaymentPayload, user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    result = create_payment_and_invoice(user["id"], payload.model_dump())
    return {"invoice": result["invoice"], "payment": result["payment"]}


@app.get("/exams")
def list_exams(user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    return {"exams": get_exams_for_user(user["id"])}


@app.post("/exams")
def create_exam(payload: ExamPayload, user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    exam = create_exam_for_user(user["id"], payload.model_dump())
    return {"exam": exam}


@app.put("/exams/{exam_id}")
def update_exam(exam_id: int, payload: ExamPayload, user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    exam = update_exam_for_user(user["id"], exam_id, payload.model_dump())
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return {"exam": exam}


@app.delete("/exams/{exam_id}")
def delete_exam(exam_id: int, user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    deleted = delete_exam_for_user(user["id"], exam_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Exam not found")
    return {"deleted": True}


@app.get("/results")
def list_results(user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    return {"results": get_results_for_user(user["id"])}


@app.post("/results")
def save_result(payload: ResultPayload, user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    result = create_or_update_result_for_user(user["id"], payload.model_dump())
    return {"result": result}


@app.get("/gradesheets/{exam_id}/{student_id}")
def get_gradesheet(exam_id: int, student_id: int, user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    exam = get_exam_by_id_for_user(user["id"], exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    result = get_result_for_user(user["id"], exam_id, student_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return {"exam": exam, "result": result, "report": _build_gradesheet_report(exam, result)}


@app.get("/students")
def list_students(user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    students = get_students_for_user(user["id"])
    return {"students": students}


@app.post("/students")
def create_student(payload: StudentPayload, user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    student = create_student_for_user(user["id"], payload.model_dump())
    return {"student": student}


@app.put("/students/{student_id}")
def update_student(student_id: int, payload: StudentPayload, user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    student = update_student_for_user(user["id"], student_id, payload.model_dump())
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"student": student}


@app.delete("/students/{student_id}")
def delete_student(student_id: int, user: Annotated[dict[str, object], Depends(get_current_user)]) -> dict[str, object]:
    deleted = delete_student_for_user(user["id"], student_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"deleted": True}


if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
