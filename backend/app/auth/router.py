import httpx
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, JSONResponse
from app.core.config import settings
from app.auth.session import set_session, clear_session, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
FRONTEND_URL = "https://healthprior.volskyi-dmytro.com"


@router.get("/github")
async def github_login():
    """Redirect browser to GitHub OAuth consent screen."""
    params = f"client_id={settings.GITHUB_OAUTH_CLIENT_ID}&scope=read:user+user:email"
    return RedirectResponse(f"{GITHUB_AUTHORIZE_URL}?{params}")


@router.get("/callback")
async def github_callback(request: Request, code: str = "", error: str = ""):
    """Handle GitHub OAuth callback."""
    if error or not code:
        return RedirectResponse(f"{FRONTEND_URL}?error=oauth_failed")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.GITHUB_OAUTH_CLIENT_ID,
                "client_secret": settings.GITHUB_OAUTH_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")

        if not access_token:
            return RedirectResponse(f"{FRONTEND_URL}?error=no_token")

        user_resp = await client.get(
            GITHUB_USER_URL,
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        )
        gh_user = user_resp.json()

        emails_resp = await client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        )
        emails = emails_resp.json()

    primary_email = next(
        (e["email"] for e in emails if e.get("primary") and e.get("verified")),
        None,
    )
    if not settings.ADMIN_GITHUB_EMAIL:
        is_admin = True
    else:
        is_admin = bool(
            primary_email and
            primary_email.lower() == settings.ADMIN_GITHUB_EMAIL.lower()
        )
        if not is_admin:
            return RedirectResponse(f"{FRONTEND_URL}?error=access_denied")

    response = RedirectResponse(FRONTEND_URL)
    set_session(response, {
        "github_user_id": gh_user.get("id"),
        "github_login": gh_user.get("login", ""),
        "github_avatar_url": gh_user.get("avatar_url", ""),
        "github_email": primary_email,
        "is_admin": is_admin,
    })
    return response


@router.get("/me")
async def me(request: Request):
    """Return current session user or 401."""
    user = get_current_user(request)
    if not user:
        return JSONResponse({"authenticated": False}, status_code=401)
    return {
        "authenticated": True,
        "login": user.get("github_login"),
        "avatar_url": user.get("github_avatar_url"),
        "email": user.get("github_email"),
    }


@router.get("/logout")
async def logout():
    response = RedirectResponse("https://healthprior.volskyi-dmytro.com")
    clear_session(response)
    return response
