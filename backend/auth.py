import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException

from storage import get_user_by_id

JWT_EXPIRE_HOURS = 24


def _secret_key() -> str:
    return os.getenv("JWT_SECRET", "resumeiq-dev-secret-change-in-prod")


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("utf-8"))


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return base64.b64encode(salt + digest).decode("utf-8")


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        raw = base64.b64decode(stored_hash.encode("utf-8"))
        salt, expected = raw[:16], raw[16:]
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
        return hmac.compare_digest(digest, expected)
    except Exception:
        return False


def create_access_token(user_id: int, email: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_EXPIRE_HOURS)).timestamp()),
    }
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(_secret_key().encode("utf-8"), signing_input, hashlib.sha256).digest()
    signature_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Malformed token")

        header_b64, payload_b64, signature_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_signature = hmac.new(
            _secret_key().encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()

        incoming_signature = _b64url_decode(signature_b64)
        if not hmac.compare_digest(expected_signature, incoming_signature):
            raise ValueError("Invalid signature")

        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        now_ts = int(datetime.now(timezone.utc).timestamp())
        if int(payload.get("exp", 0)) < now_ts:
            raise HTTPException(status_code=401, detail="Token expired.")
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token.") from exc


def current_user_from_auth_header(authorization: str | None) -> dict | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    try:
        user_id = int(payload.get("sub", "0"))
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token subject.")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return user


def require_current_user(authorization: str | None) -> dict:
    user = current_user_from_auth_header(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user
