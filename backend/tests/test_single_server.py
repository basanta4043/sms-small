import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app


client = TestClient(app)


def test_api_prefix_health_endpoint() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_serves_frontend_shell() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert "<!doctype html>" in response.text.lower() or "<html" in response.text.lower()


def test_api_prefix_students_post_requires_auth_not_method_not_allowed() -> None:
    response = client.post(
        "/api/students",
        json={"name": "Test Student", "class_name": "Grade 1"},
    )
    assert response.status_code == 401
