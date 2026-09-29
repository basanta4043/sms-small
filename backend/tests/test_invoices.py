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
            cur.execute("DELETE FROM payments")
            cur.execute("DELETE FROM invoices")
            cur.execute("DELETE FROM students")
            cur.execute("DELETE FROM users")
        conn.commit()
    finally:
        conn.close()


def test_create_blank_invoice_with_nepali_months() -> None:
    user = create_user(username="invoiceuser", password_hash="hashed", school_name="Test School")
    headers = {"Authorization": f"Bearer {create_access_token(str(user['id']))}"}
    student_response = client.post(
        "/students",
        json={"name": "Asha Patel", "class_name": "Grade 5", "section": "A"},
        headers=headers,
    )
    assert student_response.status_code == 200, student_response.text
    student = student_response.json()["student"]

    invalid_month_response = client.post(
        "/fees/invoices",
        json={"student_id": student["id"], "date": "2026-04-14", "fee_periods": ["January"]},
        headers=headers,
    )
    assert invalid_month_response.status_code == 400

    response = client.post(
        "/fees/invoices",
        json={
            "student_id": student["id"],
            "date": "2026-04-14",
            "fee_periods": ["Ashwin", "Baishak", "Ashwin"],
            "items": [
                {"name": "Monthly fee", "amount": 1200},
                {"name": "Examination fee", "amount": 300},
                {"name": "", "amount": 999},
            ],
        },
        headers=headers,
    )
    assert response.status_code == 200, response.text
    invoice = response.json()["invoice"]
    assert invoice["student_id"] == student["id"]
    assert invoice["amount"] == 1500
    assert invoice["status"] == "Draft"
    assert invoice["items"] == [
        {"name": "Monthly fee", "amount": 1200},
        {"name": "Examination fee", "amount": 300},
    ]
    assert invoice["fee_periods"] == ["Baishak", "Ashwin"]
    assert invoice["fee_months"] == 2
    assert client.get("/fees/payments", headers=headers).json()["payments"] == []
