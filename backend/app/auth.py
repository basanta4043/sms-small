import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, UTC
from typing import Any

import jwt

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "school-manager-super-secret-key-please-change")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return "pbkdf2_sha256$200000$" + base64.b64encode(salt).decode("ascii") + "$" + base64.b64encode(derived).decode("ascii")


if __name__ == "__main__":
    # Example usage
    password = "Test@123"
    hashed = hash_password(password)
    print(f"Password: {hashed}")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password.startswith("pbkdf2_sha256$"):
        return False

    _, iterations_str, salt_b64, derived_b64 = hashed_password.split("$", 3)
    iterations = int(iterations_str)
    salt = base64.b64decode(salt_b64.encode("ascii"))
    expected = base64.b64decode(derived_b64.encode("ascii"))
    actual = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(actual, expected)


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": subject,
        "exp": datetime.now(UTC) + expires_delta,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
