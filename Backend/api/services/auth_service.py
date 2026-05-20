from datetime import datetime, timedelta

import httpx
import hashlib
import base64

import bcrypt
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from Backend.api.config.settings import get_settings
from Backend.api.models.user import User
from Backend.api.database.redis import cache_set, cache_delete, key_user

settings = get_settings()


def _normalize_password(password: str) -> bytes:
    """SHA-256 pre-hash → base64 to keep input within bcrypt's 72-byte limit."""
    digest = hashlib.sha256(password.encode()).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_normalize_password(password), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_normalize_password(plain), hashed.encode())


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire, "type": "access"}, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": expire, "type": "refresh"}, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")


async def register_user(db: AsyncSession, email: str, password: str, name: str | None) -> User:
    existing = await db.scalar(select(User).where(User.email == email))
    if existing:
        raise ValueError("Email already registered.")

    user = User(
        email=email,
        password_hash=hash_password(password),
        name=name,
        auth_provider="email",
    )
    db.add(user)
    await db.flush()
    return user


async def login_user(db: AsyncSession, email: str, password: str) -> tuple[User, str, str]:
    user = await db.scalar(select(User).where(User.email == email))
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password.")
    if not user.is_active:
        raise ValueError("Account is disabled.")

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    user.access_token = access
    user.refresh_token = refresh
    user.token_expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    user.last_login_at = datetime.utcnow()

    # Cache user data so middleware can authenticate without a DB hit
    await cache_set(key_user(user.id), {"id": user.id, "email": user.email, "is_active": user.is_active}, ttl=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    return user, access, refresh


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> tuple[str, str]:
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise ValueError("Not a refresh token.")

    user = await db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise ValueError("User not found or inactive.")

    access = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)

    user.access_token = access
    user.refresh_token = new_refresh
    user.token_expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    await cache_set(key_user(user.id), {"id": user.id, "email": user.email, "is_active": user.is_active}, ttl=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    return access, new_refresh


async def logout_user(db: AsyncSession, user_id: str) -> None:
    user = await db.get(User, user_id)
    if user:
        user.access_token = None
        user.refresh_token = None
    await cache_delete(key_user(user_id))


# ── Google OAuth ──────────────────────────────────────────────────────────────

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def google_auth_url(state: str | None = None) -> str:
    """Build the Google OAuth2 consent-screen URL."""
    import urllib.parse
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    if state:
        params["state"] = state
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"


async def google_callback(db: AsyncSession, code: str) -> tuple[User, str, str]:
    """Exchange Google OAuth code for tokens, upsert user, return JWT pair."""
    async with httpx.AsyncClient() as client:
        # Exchange code for Google tokens
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            raise ValueError(f"Google token exchange failed: {token_resp.text}")
        google_tokens = token_resp.json()

        # Fetch user info
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_tokens['access_token']}"},
        )
        if userinfo_resp.status_code != 200:
            raise ValueError("Failed to fetch Google user info.")
        info = userinfo_resp.json()

    google_id = info.get("sub")
    email = info.get("email")
    name = info.get("name")
    avatar_url = info.get("picture")

    if not email or not google_id:
        raise ValueError("Google did not return email or user ID.")

    # Upsert: find by google_id first, then by email (account linking)
    user = await db.scalar(select(User).where(User.google_id == google_id))
    if not user:
        user = await db.scalar(select(User).where(User.email == email))

    if user:
        # Update Google fields in case they changed
        user.google_id = google_id
        user.auth_provider = "google"
        user.name = user.name or name
        user.avatar_url = user.avatar_url or avatar_url
        user.last_login_at = datetime.utcnow()
    else:
        user = User(
            email=email,
            google_id=google_id,
            name=name,
            avatar_url=avatar_url,
            auth_provider="google",
        )
        db.add(user)
        await db.flush()

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    user.access_token = access
    user.refresh_token = refresh
    user.token_expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    await cache_set(
        key_user(user.id),
        {"id": user.id, "email": user.email, "is_active": user.is_active},
        ttl=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return user, access, refresh
