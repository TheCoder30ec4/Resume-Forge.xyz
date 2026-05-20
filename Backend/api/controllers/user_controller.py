from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from Backend.api.database.base import get_db
from Backend.api.middleware.auth_middleware import get_current_user
from Backend.api.models.user import User
from Backend.api.schemas.user import UserResponse, UserProfileUpdate, UserProfileResponse, LinkedinConnectRequest, GithubConnectRequest
from Backend.api.services import user_service
from Backend.api.utils.logger import log

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.refresh(current_user, ["profile"])
    return current_user


@router.patch("/me/profile", response_model=UserProfileResponse)
async def update_profile(
    req: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await user_service.update_profile(db, current_user.id, req.model_dump(exclude_none=True))
    return profile


@router.post("/me/linkedin")
async def connect_linkedin(
    req: LinkedinConnectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conn = await user_service.connect_linkedin(db, current_user.id, req.linkedin_url)
    log.info(f"[user:{current_user.id}] LinkedIn connected: {conn.linkedin_public_id}")
    return {"message": "LinkedIn connected.", "public_id": conn.linkedin_public_id}


@router.post("/me/github")
async def connect_github(
    req: GithubConnectRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        conn = await user_service.connect_github(db, current_user.id, req.code)
        log.info(f"[user:{current_user.id}] GitHub connected: {conn.github_username}")
        return {"message": "GitHub connected.", "username": conn.github_username}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/me/github/repos")
async def list_github_repos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the user's GitHub repos using their stored OAuth token."""
    from sqlalchemy import select
    from Backend.api.models.connections import GithubConnection
    conn = await db.scalar(select(GithubConnection).where(GithubConnection.user_id == current_user.id))
    if not conn or not conn.access_token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="GitHub not connected.")
    import httpx
    repos = []
    page = 1
    async with httpx.AsyncClient() as client:
        while True:
            resp = await client.get(
                "https://api.github.com/user/repos",
                headers={"Authorization": f"Bearer {conn.access_token}", "Accept": "application/vnd.github+json"},
                params={"per_page": 100, "page": page, "sort": "pushed", "type": "owner"},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail="Failed to fetch repos from GitHub.")
            batch = resp.json()
            if not batch:
                break
            repos.extend(batch)
            if len(batch) < 100:
                break
            page += 1
    return [
        {
            "full_name": r["full_name"],
            "name": r["name"],
            "description": r.get("description") or "",
            "language": r.get("language") or "",
            "stargazers_count": r.get("stargazers_count", 0),
            "pushed_at": r.get("pushed_at") or "",
            "private": r.get("private", False),
        }
        for r in repos
    ]


@router.get("/me/candidate-data")
async def get_candidate_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await user_service.get_candidate_data(db, current_user.id)
    if not data:
        return {"message": "No candidate data yet. Complete onboarding first."}
    return data
