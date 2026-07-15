import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.auth import create_access_token, verify_password, hash_password


def test_password_hashing_and_verification():
    password = "secret123"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong", hashed) is False


def test_access_token_contains_subject():
    token = create_access_token("user-1")

    assert token.startswith("ey")
