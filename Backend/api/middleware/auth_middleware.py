from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from Backend.api.services.auth_service import decode_token
from Backend.api.database.base import get_db
from Backend.api.database.redis import cache_get, cache_set, key_user
from Backend.api.models.user import User
from Backend.api.config.settings import get_settings

settings = get_settings()
_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not an access token.")

    user_id = payload.get("sub")

    # Try Redis cache first — fall back to DB if Redis is unavailable
    try:
        cached = await cache_get(key_user(user_id))
    except Exception:
        cached = None

    if cached and not cached.get("is_active"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")

    user = await db.get(User, user_id)
    if user and cached is None:
        try:
            await cache_set(
                key_user(user_id),
                {"id": user.id, "email": user.email, "is_active": user.is_active},
                ttl=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            )
        except Exception:
            pass

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

    return user


async def get_current_user_from_token(token: str, db: AsyncSession) -> User:
    """Authenticate a user directly from a token string (used in OAuth callbacks)."""
    try:
        payload = decode_token(token)
    except ValueError:
        raise ValueError("Invalid or expired token.")

    if payload.get("type") != "access":
        raise ValueError("Not an access token.")

    user_id = payload.get("sub")
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise ValueError("User not found or inactive.")
    return user
