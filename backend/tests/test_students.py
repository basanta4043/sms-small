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
            cur.execute("DELETE FROM students")
            cur.execute("DELETE FROM users")
        conn.commit()
    finally:
        conn.close()


def test_student_crud_flow() -> None:
    user = create_user(username="studentuser", password_hash="hashed", school_name="Test School")
    token = create_access_token(str(user["id"]))
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "roll_no": "101",
        "name": "Asha Patel",
        "class_name": "Grade 5",
        "section": "A",
        "gender": "Female",
        "dob": "2014-05-10",
        "guardian_name": "Ravi Patel",
        "phone": "9812345678",
        "address": "Kathmandu",
        "admission_date": "2024-01-05",
        "status": "Active",
    }

    create_resp = client.post("/students", json=payload, headers=headers)
    assert create_resp.status_code == 200, create_resp.text
    created = create_resp.json()["student"]
    assert created["name"] == payload["name"]

    list_resp = client.get("/students", headers=headers)
    assert list_resp.status_code == 200, list_resp.text
    students = list_resp.json()["students"]
    assert len(students) == 1
    assert students[0]["roll_no"] == "101"

    update_resp = client.put(
        f"/students/{created['id']}",
        json={**payload, "name": "Asha Updated"},
        headers=headers,
    )
    assert update_resp.status_code == 200, update_resp.text
    assert update_resp.json()["student"]["name"] == "Asha Updated"

    delete_resp = client.delete(f"/students/{created['id']}", headers=headers)
    assert delete_resp.status_code == 200, delete_resp.text

    final_resp = client.get("/students", headers=headers)
    assert final_resp.status_code == 200, final_resp.text
    assert final_resp.json()["students"] == []


def test_student_csv_import(monkeypatch) -> None:
    user = create_user(username="importuser", password_hash="hashed", school_name="Import School")
    token = create_access_token(str(user["id"]))
    headers = {"Authorization": f"Bearer {token}"}

    created_students = []

    def fake_create_student_for_user(user_id, student):
        created_students.append({"user_id": user_id, **student})
        return {
            "id": len(created_students),
            "user_id": user_id,
            **student,
            "created_at": "2024-01-01T00:00:00Z",
        }

    monkeypatch.setattr("app.main.create_student_for_user", fake_create_student_for_user)

    csv_content = (
        "name,rollNo,className,section,gender,dob,guardianName,phone,address,admissionDate,status\n"
        "Alice Patel,101,Grade 5,A,Female,2014-05-10,Ravi Patel,9812345678, Kathmandu,2024-01-05,Active\n"
        "Bob Sharma,102,Grade 6,B,Male,2013-04-02,Sita Sharma,9800000000,Pokhara,2024-02-01,Active\n"
    ).encode("utf-8")

    response = client.post(
        "/students/import",
        files={"file": ("students.csv", csv_content, "text/csv")},
        headers=headers,
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["imported"] == 2
    assert payload["students"][0]["name"] == "Alice Patel"
    assert created_students[0]["class_name"] == "Grade 5"
