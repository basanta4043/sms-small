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
            cur.execute("DELETE FROM schools")
            cur.execute("DELETE FROM users")
        conn.commit()
    finally:
        conn.close()


def test_auth_me_returns_school_details() -> None:
    user = create_user(username="schooluser", password_hash="hashed", school_name="Everest Valley School")
    token = create_access_token(str(user["id"]))
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["school"]["name"] == "Everest Valley School"
