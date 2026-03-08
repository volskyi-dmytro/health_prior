from typing import Optional
from fastapi import Request
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from app.core.config import settings

_serializer = URLSafeTimedSerializer(settings.SESSION_SECRET_KEY)
SESSION_COOKIE = "hp_session"
MAX_AGE = 60 * 60 * 24 * 7  # 7 days


def set_session(response, data: dict) -> None:
    token = _serializer.dumps(data)
    response.set_cookie(
        SESSION_COOKIE, token,
        max_age=MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=True,
    )


def clear_session(response) -> None:
    response.delete_cookie(SESSION_COOKIE)


def get_session(request: Request) -> Optional[dict]:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    try:
        return _serializer.loads(token, max_age=MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None


def get_current_user(request: Request) -> Optional[dict]:
    return get_session(request)


def require_auth(request: Request) -> dict:
    """FastAPI dependency — raises 401 if not authenticated."""
    from fastapi import HTTPException
    user = get_session(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    return user
