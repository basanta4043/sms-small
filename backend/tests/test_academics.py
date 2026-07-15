import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("DB_NAME", "schooldb")
os.environ.setdefault("DB_USER", "postgres")
os.environ.setdefault("DB_PASSWORD", "Test@123")

from fastapi.testclient import TestClient

from app.auth import create_access_token
from app.database import create_user, get_connection, init_schema
from app.main import app


client = TestClient(app)


def setup_function() -> None:
    init_schema()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM results")
            cur.execute("DELETE FROM exams")
            cur.execute("DELETE FROM students")
            cur.execute("DELETE FROM users")
        conn.commit()
    finally:
        conn.close()


def test_exam_result_and_gradesheet_flow() -> None:
    user = create_user(username="academicuser", password_hash="hashed", school_name="Test School")
    token = create_access_token(str(user["id"]))
    headers = {"Authorization": f"Bearer {token}"}

    exam_payload = {
        "name": "Mid Term",
        "term": "2026 Term 1",
        "class_name": "Grade 5",
        "subjects": [
            {"name": "Math", "maxMarks": 100, "passMarks": 33},
            {"name": "Science", "maxMarks": 100, "passMarks": 33},
        ],
    }

    create_exam_resp = client.post("/exams", json=exam_payload, headers=headers)
    assert create_exam_resp.status_code == 200, create_exam_resp.text
    exam = create_exam_resp.json()["exam"]
    assert exam["name"] == exam_payload["name"]

    student_payload = {
        "roll_no": "101",
        "name": "Asha Patel",
        "class_name": "Grade 5",
        "section": "A",
        "status": "Active",
    }
    create_student_resp = client.post("/students", json=student_payload, headers=headers)
    assert create_student_resp.status_code == 200, create_student_resp.text
    student = create_student_resp.json()["student"]

    result_payload = {
        "exam_id": exam["id"],
        "student_id": student["id"],
        "marks": [
            {"subject": "Math", "obtained": 80, "max_marks": 100},
            {"subject": "Science", "obtained": 72, "max_marks": 100},
        ],
    }

    create_result_resp = client.post("/results", json=result_payload, headers=headers)
    assert create_result_resp.status_code == 200, create_result_resp.text
    result = create_result_resp.json()["result"]
    assert result["exam_id"] == exam["id"]
    assert result["student_id"] == student["id"]

    gradesheet_resp = client.get(f"/gradesheets/{exam['id']}/{student['id']}", headers=headers)
    assert gradesheet_resp.status_code == 200, gradesheet_resp.text
    gradesheet = gradesheet_resp.json()
    assert gradesheet["report"]["rows"][0]["obtained"] == 80
    assert gradesheet["report"]["overallPct"] >= 70
