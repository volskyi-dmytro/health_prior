from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.database import get_db
from app.auth.session import require_auth

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user: dict = Depends(require_auth)) -> dict:
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/users")
async def list_allowed_users(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_require_admin),
):
    """List all users granted AI access."""
    result = await db.execute(
        text("SELECT github_login, approved_by, created_at FROM allowed_users ORDER BY created_at DESC")
    )
    rows = result.fetchall()
    return [
        {"github_login": r.github_login, "approved_by": r.approved_by, "granted_at": r.created_at.isoformat()}
        for r in rows
    ]


@router.post("/users/{login}")
async def grant_ai_access(
    login: str,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(_require_admin),
):
    """Grant AI access to a GitHub user."""
    await db.execute(
        text("""
            INSERT INTO allowed_users (github_login, approved_by)
            VALUES (:login, :approved_by)
            ON CONFLICT (github_login) DO NOTHING
        """),
        {"login": login.lower(), "approved_by": admin["github_login"]},
    )
    await db.commit()
    return {"status": "granted", "github_login": login.lower()}


@router.delete("/users/{login}")
async def revoke_ai_access(
    login: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_require_admin),
):
    """Revoke AI access from a GitHub user."""
    result = await db.execute(
        text("DELETE FROM allowed_users WHERE github_login = :login"),
        {"login": login.lower()},
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"User '{login}' not found in allowed list")
    return {"status": "revoked", "github_login": login.lower()}
