import asyncio
from datetime import datetime

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from Backend.api.config.settings import get_settings
from Backend.api.models.user import User
from Backend.api.models.profile import UserProfile, CandidateData
from Backend.api.models.connections import GithubConnection, LinkedinConnection
from Backend.api.database.redis import (
    cache_set, cache_get, cache_delete,
    key_user, key_linkedin, key_candidate_data, key_github_repo_summary,
)

settings = get_settings()


# ── Profile ───────────────────────────────────────────────────────────────────

async def get_or_create_profile(db: AsyncSession, user_id: str) -> UserProfile:
    profile = await db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        await db.flush()
    return profile


async def update_profile(db: AsyncSession, user_id: str, data: dict) -> UserProfile:
    profile = await get_or_create_profile(db, user_id)
    for k, v in data.items():
        if v is not None:
            setattr(profile, k, v)
    await cache_delete(key_user(user_id))
    return profile


# ── LinkedIn connection ───────────────────────────────────────────────────────

async def connect_linkedin(db: AsyncSession, user_id: str, linkedin_url: str) -> LinkedinConnection:
    conn = await db.scalar(select(LinkedinConnection).where(LinkedinConnection.user_id == user_id))
    if not conn:
        conn = LinkedinConnection(user_id=user_id, linkedin_profile_url=linkedin_url)
        db.add(conn)
    else:
        conn.linkedin_profile_url = linkedin_url
        conn.updated_at = datetime.utcnow()

    # Extract public identifier from URL (e.g. "ch-varun" from linkedin.com/in/ch-varun)
    parts = linkedin_url.rstrip("/").split("/")
    if "in" in parts:
        conn.linkedin_public_id = parts[parts.index("in") + 1]

    # Invalidate LinkedIn cache so fresh data is fetched next time
    await cache_delete(key_linkedin(user_id))
    await db.flush()
    return conn


async def get_linkedin_profile(user_id: str, linkedin_url: str) -> dict:
    """Return LinkedIn profile from Redis cache, falling back to Apify scrape.
    Caches result for 24h so we never re-scrape within the same day."""
    from Backend.workflow.tools.get_linkedin_data import get_linkedin

    cached = await cache_get(key_linkedin(user_id))
    if cached:
        return cached

    profile = await asyncio.to_thread(get_linkedin, linkedin_url)
    await cache_set(key_linkedin(user_id), profile, ttl=settings.LINKEDIN_CACHE_TTL)
    return profile


# ── GitHub connection ─────────────────────────────────────────────────────────

async def connect_github(db: AsyncSession, user_id: str, code: str) -> GithubConnection:
    """Exchange OAuth code for access token and store the connection."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_data = resp.json()

    access_token = token_data.get("access_token")
    if not access_token:
        raise ValueError(f"GitHub OAuth failed: {token_data}")

    # Fetch GitHub user info
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        )
        gh_user = user_resp.json()

    conn = await db.scalar(select(GithubConnection).where(GithubConnection.user_id == user_id))
    if not conn:
        conn = GithubConnection(user_id=user_id)
        db.add(conn)

    conn.access_token = access_token
    conn.github_user_id = str(gh_user.get("id", ""))
    conn.github_username = gh_user.get("login")
    conn.scopes = token_data.get("scope", "")
    conn.updated_at = datetime.utcnow()

    await db.flush()
    return conn


# ── Candidate data ────────────────────────────────────────────────────────────

async def get_candidate_data(db: AsyncSession, user_id: str) -> CandidateData | None:
    """Return candidate data from Redis cache first, then DB."""
    cached = await cache_get(key_candidate_data(user_id))
    if cached:
        return cached   # returns raw dict when from cache

    data = await db.scalar(select(CandidateData).where(CandidateData.user_id == user_id))
    if data:
        payload = {
            "education": data.education,
            "experience": data.experience,
            "projects": data.projects,
            "certifications": data.certifications,
            "skills": data.skills,
            "languages": data.languages,
            "github_repo_summaries": data.github_repo_summaries,
            "last_extracted_at": str(data.last_extracted_at),
        }
        await cache_set(key_candidate_data(user_id), payload, ttl=settings.CACHE_TTL_SECONDS)
        return data
    return None


async def save_candidate_data(db: AsyncSession, user_id: str, payload: dict) -> CandidateData:
    data = await db.scalar(select(CandidateData).where(CandidateData.user_id == user_id))
    if not data:
        data = CandidateData(user_id=user_id)
        db.add(data)

    for field in ("education", "experience", "projects", "certifications", "skills", "languages", "github_repo_summaries"):
        if field in payload:
            setattr(data, field, payload[field])

    data.last_extracted_at = datetime.utcnow()
    await cache_delete(key_candidate_data(user_id))
    await db.flush()
    return data
