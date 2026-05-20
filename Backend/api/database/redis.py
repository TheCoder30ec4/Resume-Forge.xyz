import json
from typing import Any
import redis.asyncio as aioredis

from Backend.api.config.settings import get_settings
from Backend.api.utils.logger import cache_log

settings = get_settings()

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis


async def cache_set(key: str, value: Any, ttl: int = settings.CACHE_TTL_SECONDS) -> None:
    try:
        r = await get_redis()
        await r.setex(key, ttl, json.dumps(value, default=str))
        cache_log.info(f"Saved '{key}' to Redis (expires in {ttl}s)")
    except Exception as exc:
        cache_log.warning(f"Could not save '{key}' to Redis: {exc}")


async def cache_get(key: str) -> Any | None:
    try:
        r = await get_redis()
        raw = await r.get(key)
        if raw is None:
            cache_log.info(f"No '{key}' in Redis (cache miss)")
            return None
        cache_log.info(f"Got '{key}' from Redis (cache hit)")
        return json.loads(raw)
    except Exception as exc:
        cache_log.warning(f"Could not read '{key}' from Redis: {exc}")
        return None


async def cache_delete(key: str) -> None:
    try:
        r = await get_redis()
        await r.delete(key)
        cache_log.info(f"Deleted '{key}' from Redis")
    except Exception as exc:
        cache_log.warning(f"Could not delete '{key}' from Redis: {exc}")


async def cache_delete_pattern(pattern: str) -> None:
    try:
        r = await get_redis()
        keys = await r.keys(pattern)
        if keys:
            await r.delete(*keys)
            cache_log.info(f"Deleted {len(keys)} Redis key(s) matching '{pattern}'")
    except Exception as exc:
        cache_log.warning(f"Could not delete Redis keys matching '{pattern}': {exc}")


# ── Cache key builders ────────────────────────────────────────────────────────

def key_user(user_id: str) -> str:
    return f"user:{user_id}"

def key_linkedin(user_id: str) -> str:
    return f"linkedin:{user_id}"

def key_github_repo_summary(user_id: str, repo: str) -> str:
    repo_slug = repo.replace("/", "__")
    return f"github_summary:{user_id}:{repo_slug}"

def key_candidate_data(user_id: str) -> str:
    return f"candidate:{user_id}"

def key_session_state(session_id: str) -> str:
    return f"session:{session_id}:state"

def key_draft(version_id: str) -> str:
    return f"draft:{version_id}"
