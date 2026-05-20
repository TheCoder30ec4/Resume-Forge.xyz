import asyncio
import json
from pathlib import Path

from Backend.workflow.tools.render_cv import save_yaml, render_cv, make_basename

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from Backend.api.database.base import get_db, AsyncSessionLocal
from Backend.api.database.redis import cache_set, key_draft
from Backend.api.middleware.auth_middleware import get_current_user, get_current_user_from_token
from Backend.api.models.user import User
from Backend.api.models.resume import ResumeSession, ResumeVersion
from Backend.api.models.connections import LinkedinConnection, GithubConnection
from Backend.api.models.profile import UserProfile
from Backend.api.schemas.resume import (
    StartResumeRequest, ReviseResumeRequest, ApproveVersionRequest, UpdateDraftRequest,
    ResumeSessionResponse, ResumeVersionResponse,
)
from Backend.api.services import resume_service, user_service
from Backend.api.workers.resume_worker import run_resume_workflow, summarize_remaining_repos_background
from Backend.api.utils.logger import resume_log

router = APIRouter(prefix="/resume", tags=["Resume"])


def _display_name(user: User) -> str:
    """Best-effort name for output filenames (no DB lookup)."""
    return user.name or user.email.split("@")[0]


async def _profile_ctx(db: AsyncSession, user: User) -> tuple[str, str, bool]:
    """Resolve résumé identity from the user's profile: (name, location, is_fresher).

    Name and location come from the profile-setup details the user entered, so
    the workflow uses them verbatim instead of generating them.
    """
    profile = await db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
    name = (profile.full_name if profile and profile.full_name else None) \
        or user.name or user.email.split("@")[0]
    location = (profile.location if profile else None) or ""
    is_fresher = bool(profile and profile.is_fresher)
    return name, location, is_fresher


async def _render_version_pdf(version_id: str, draft: dict, theme: str, basename: str) -> bytes | None:
    """Render a version's PDF from its JSON draft and persist the blob.

    Slow (shells out to rendercv) — runs as a background task off the save path
    so editing stays snappy. Returns the PDF bytes, or None on failure.
    """
    try:
        yaml_path = await asyncio.to_thread(save_yaml, json.dumps(draft), basename)
        pdf_path = await render_cv(yaml_path, theme=theme)
        blob = Path(pdf_path).read_bytes()
    except Exception as exc:
        resume_log.error(f"PDF render failed for version {version_id}: {exc}")
        return None

    async with AsyncSessionLocal() as db:
        version = await db.get(ResumeVersion, version_id)
        if version:
            version.pdf_blob = blob
            version.pdf_output_path = pdf_path
            await db.commit()
    return blob


def _base_state(
    session: ResumeSession,
    linkedin_url: str,
    github_token: str | None,
    user_name: str,
    user_email: str,
    user_location: str,
    is_fresher: bool,
) -> dict:
    """Build the LangGraph initial state from a session row."""
    return {
        "JD": session.jd_text,
        "user_input": session.user_input,
        "session_id": session.session_id,
        "user_id": str(session.user_id),
        "UserName": user_name,
        "UserEmail": user_email,
        "UserLocation": user_location,
        "IsFresher": is_fresher,
        "LinkedinURL": linkedin_url,
        "GithubRepos": session.selected_github_repos or [],
        "GithubToken": github_token,
        "JDAnalysis": "",
        "LinkedinSummary": "",
        "GithubProjectSummary": [],
        "GapAnalysis": "",
        "ResumeDraft": "",
        "ResumeYAMLPath": "",
        "ATSScore": 0.0,
        "ATSReport": "",
        "ATSAttempts": 0,
        "Theme": session.theme,
        "RenderedPDFPath": "",
        "ParseBackOK": False,
        "FinalSummary": "",
    }


@router.post("/start", response_model=ResumeSessionResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_resume(
    req: StartResumeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not (2 <= len(req.selected_github_repos) <= 10):
        raise HTTPException(status_code=422, detail="Select between 2 and 10 GitHub repos.")

    linkedin_conn = await db.scalar(select(LinkedinConnection).where(LinkedinConnection.user_id == current_user.id))
    if not linkedin_conn:
        raise HTTPException(status_code=400, detail="Connect your LinkedIn account first.")

    github_conn = await db.scalar(select(GithubConnection).where(GithubConnection.user_id == current_user.id))

    session = await resume_service.create_session(
        db=db,
        user_id=current_user.id,
        jd_text=req.jd_text,
        jd_url=req.jd_url,
        selected_github_repos=req.selected_github_repos,
        theme=req.theme,
        user_input=req.user_input,
    )
    await db.commit()
    await db.refresh(session, ["versions"])

    p_name, p_location, p_fresher = await _profile_ctx(db, current_user)
    langgraph_state = _base_state(
        session,
        linkedin_conn.linkedin_profile_url,
        github_conn.access_token if github_conn else None,
        p_name,
        current_user.email,
        p_location,
        p_fresher,
    )

    # Run primary workflow in background
    background_tasks.add_task(run_resume_workflow, session.id, langgraph_state)

    # Summarize all other connected repos in background (non-blocking)
    if github_conn and github_conn.github_username:
        background_tasks.add_task(
            summarize_remaining_repos_background,
            user_id=current_user.id,
            all_repos=[],   # TODO: fetch all user repos from GitHub API
            priority_repos=req.selected_github_repos,
            github_token=github_conn.access_token,
            jd_analysis=req.jd_text,
        )

    resume_log.info(f"[user:{current_user.id}] Session {session.session_id} started")
    return session


@router.post("/{session_id}/revise", response_model=ResumeSessionResponse)
async def revise_resume(
    session_id: str,
    req: ReviseResumeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await resume_service.get_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.status == "running":
        raise HTTPException(status_code=409, detail="Session is already running.")

    linkedin_conn = await db.scalar(select(LinkedinConnection).where(LinkedinConnection.user_id == current_user.id))
    github_conn = await db.scalar(select(GithubConnection).where(GithubConnection.user_id == current_user.id))

    # Update user_input and reset ATS counter — reuse cached JD/LinkedIn/GitHub/Gap from session
    session.user_input = req.user_input
    await resume_service.update_session_status(db, session, status="running")
    await db.commit()

    # On revise: pass cached upstream data so those nodes are skipped by the workflow
    p_name, p_location, p_fresher = await _profile_ctx(db, current_user)
    revise_state = _base_state(
        session,
        linkedin_conn.linkedin_profile_url,
        github_conn.access_token if github_conn else None,
        p_name,
        current_user.email,
        p_location,
        p_fresher,
    )
    revise_state.update({
        "user_input": req.user_input,
        "ATSAttempts": 0,
        "JDAnalysis": session.jd_analysis or "",
        "LinkedinSummary": session.linkedin_summary or "",
        "GithubProjectSummary": session.github_project_summary or [],
        "GapAnalysis": session.gap_analysis or "",
    })

    background_tasks.add_task(run_resume_workflow, session.id, revise_state)
    resume_log.info(f"[user:{current_user.id}] Session {session.session_id} revise started")

    await db.refresh(session, ["versions"])
    return session


@router.get("/{session_id}", response_model=ResumeSessionResponse)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await resume_service.get_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session


@router.get("/", response_model=list[ResumeSessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await resume_service.list_sessions(db, current_user.id)


@router.post("/{session_id}/approve")
async def approve_version(
    session_id: str,
    req: ApproveVersionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await resume_service.get_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    version = await db.get(ResumeVersion, req.version_id)
    if not version or version.session_id != session.id:
        raise HTTPException(status_code=404, detail="Version not found.")

    pdf_path = await resume_service.approve_version(db, version, session_id)
    await db.commit()
    resume_log.info(f"[user:{current_user.id}] Version {version.version_number} approved → {pdf_path}")
    return {"message": "Approved.", "pdf_path": pdf_path}


@router.patch("/{session_id}/versions/{version_id}/draft", response_model=ResumeVersionResponse)
async def update_draft(
    session_id: str,
    version_id: str,
    req: UpdateDraftRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await resume_service.get_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    version = await db.get(ResumeVersion, version_id)
    if not version or version.session_id != session.id:
        raise HTTPException(status_code=404, detail="Version not found.")
    if version.is_approved:
        raise HTTPException(status_code=409, detail="Approved versions cannot be edited.")

    # Persist the JSON draft only — this returns immediately. The PDF render
    # (slow rendercv subprocess) is moved off the request path: the frontend
    # preview already renders live from this JSON, so the editor stays snappy.
    version.resume_draft = req.resume_draft
    version.pdf_blob = None          # stale until the background render finishes
    await db.commit()
    await db.refresh(version)

    # Cache the draft JSON in Redis for fast retrieval.
    await cache_set(key_draft(version_id), req.resume_draft)

    # Render the PDF in the background; it is ready by the time the user downloads.
    background_tasks.add_task(
        _render_version_pdf,
        version_id,
        req.resume_draft,
        session.theme,
        make_basename(_display_name(current_user), session_id),
    )

    resume_log.info(f"[user:{current_user.id}] Version {version.version_number} draft saved (PDF rendering in background)")
    return version


@router.get("/{session_id}/versions/{version_id}/pdf")
async def download_pdf(
    session_id: str,
    version_id: str,
    token: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    # The PDF link is opened in a new browser tab via <a href>, which cannot send
    # an Authorization header — so the access token arrives as a query param.
    if not token:
        raise HTTPException(status_code=401, detail="Missing access token.")
    try:
        current_user = await get_current_user_from_token(token, db)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    session = await resume_service.get_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    version = await db.get(ResumeVersion, version_id)
    if not version or version.session_id != session.id:
        raise HTTPException(status_code=404, detail="Version not found.")

    pdf_blob = version.pdf_blob
    # The background render may not have finished yet (or a prior save cleared
    # the blob) — render on demand so the download always works.
    if not pdf_blob:
        if not version.resume_draft:
            raise HTTPException(status_code=404, detail="PDF not available.")
        pdf_blob = await _render_version_pdf(
            version_id,
            version.resume_draft,
            session.theme,
            make_basename(_display_name(current_user), session_id),
        )
        if not pdf_blob:
            raise HTTPException(status_code=422, detail="PDF render failed.")

    # Write blob to temp file for streaming
    import tempfile
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.write(pdf_blob)
    tmp.close()

    return FileResponse(
        path=tmp.name,
        media_type="application/pdf",
        filename=f"resume_{session_id}_v{version.version_number}.pdf",
    )
