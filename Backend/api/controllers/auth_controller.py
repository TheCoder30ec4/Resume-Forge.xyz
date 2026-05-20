from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from Backend.api.database.base import get_db
from Backend.api.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest
from Backend.api.services import auth_service
from Backend.api.utils.logger import auth_log

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await auth_service.register_user(db, req.email, req.password, req.name)
        access = auth_service.create_access_token(user.id)
        refresh = auth_service.create_refresh_token(user.id)
        auth_log.info(f"New user registered: {user.email}")
        return TokenResponse(access_token=access, refresh_token=refresh)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        user, access, refresh = await auth_service.login_user(db, req.email, req.password)
        auth_log.info(f"User logged in: {user.email}")
        return TokenResponse(access_token=access, refresh_token=refresh)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        access, refresh = await auth_service.refresh_tokens(db, req.refresh_token)
        return TokenResponse(access_token=access, refresh_token=refresh)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout")
async def logout(db: AsyncSession = Depends(get_db),
                 current_user=Depends(__import__("Backend.api.middleware.auth_middleware", fromlist=["get_current_user"]).get_current_user)):
    await auth_service.logout_user(db, current_user.id)
    return {"message": "Logged out."}


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.get("/google")
async def google_login(state: str | None = Query(default=None)):
    """Redirect the browser to Google's OAuth2 consent screen."""
    from Backend.api.config.settings import get_settings
    if not get_settings().GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured.")
    url = auth_service.google_auth_url(state=state)
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Google redirects here. Exchange code for tokens, then redirect to frontend callback page."""
    frontend = "http://localhost:3000"
    try:
        user, access, refresh = await auth_service.google_callback(db, code)
        await db.commit()
        auth_log.info(f"Google login: {user.email}")
        return RedirectResponse(
            url=f"{frontend}/auth/callback?access_token={access}&refresh_token={refresh}",
            status_code=302,
        )
    except ValueError as e:
        return RedirectResponse(
            url=f"{frontend}/signin?error={str(e)}",
            status_code=302,
        )


# ── GitHub OAuth ──────────────────────────────────────────────────────────────

@router.get("/github")
async def github_login(
    access_token: str = Query(..., description="App JWT — user must already be logged in"),
):
    """Start GitHub OAuth for repo access. Embeds the user's JWT in state so the callback can authenticate them."""
    from Backend.api.config.settings import get_settings
    settings = get_settings()
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(status_code=501, detail="GitHub OAuth is not configured.")
    import urllib.parse
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": "read:user,repo",
        "state": access_token,          # carry JWT through the OAuth round-trip
    }
    url = f"https://github.com/login/oauth/authorize?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/github/callback")
async def github_callback(
    code: str = Query(...),
    state: str = Query(...),            # contains the user's app JWT
    db: AsyncSession = Depends(get_db),
):
    """GitHub redirects here. Exchange code, store connection, redirect back to frontend."""
    from Backend.api.middleware.auth_middleware import get_current_user_from_token
    frontend = "http://localhost:3000"
    try:
        user = await get_current_user_from_token(state, db)
        conn = await __import__("Backend.api.services.user_service", fromlist=["connect_github"]).connect_github(db, user.id, code)
        await db.commit()
        auth_log.info(f"GitHub connected for user {user.id}: {conn.github_username}")
        return RedirectResponse(
            url=f"{frontend}/auth/github/callback?username={conn.github_username}",
            status_code=302,
        )
    except Exception as e:
        return RedirectResponse(
            url=f"{frontend}/onboarding?github_error={str(e)}",
            status_code=302,
        )
