import uuid
from datetime import datetime
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from Backend.api.config.settings import get_settings
from Backend.api.models.resume import ResumeSession, ResumeVersion
from Backend.api.database.redis import cache_set, cache_get, key_session_state
from Backend.api.utils.logger import resume_log

settings = get_settings()


async def create_session(
    db: AsyncSession,
    user_id: str,
    jd_text: str,
    jd_url: str | None,
    selected_github_repos: list[str],
    theme: str,
    user_input: str | None,
) -> ResumeSession:
    session_id = str(uuid.uuid4())[:8]
    session = ResumeSession(
        user_id=user_id,
        session_id=session_id,
        jd_text=jd_text,
        jd_url=jd_url,
        selected_github_repos=selected_github_repos,
        theme=theme,
        user_input=user_input,
        status="pending",
    )
    db.add(session)
    await db.flush()
    resume_log.info(f"Created new session {session_id} in the database")
    return session


async def get_session(db: AsyncSession, session_id: str, user_id: str) -> ResumeSession | None:
    resume_log.info(f"Loading session {session_id} from the database")
    session = await db.scalar(
        select(ResumeSession)
        .where(ResumeSession.session_id == session_id, ResumeSession.user_id == user_id)
        .options(selectinload(ResumeSession.versions))
    )
    if session is None:
        resume_log.info(f"Session {session_id} not found in the database")
    return session


async def list_sessions(db: AsyncSession, user_id: str) -> list[ResumeSession]:
    resume_log.info(f"Loading all sessions for user {user_id} from the database")
    result = await db.scalars(
        select(ResumeSession)
        .where(ResumeSession.user_id == user_id)
        .order_by(ResumeSession.created_at.desc())
        .options(selectinload(ResumeSession.versions))
    )
    sessions = list(result.all())
    resume_log.info(f"Loaded {len(sessions)} session(s) from the database")
    return sessions


async def update_session_status(
    db: AsyncSession,
    session: ResumeSession,
    status: str,
    ats_score: float = 0.0,
    ats_attempts: int = 0,
    ats_report: dict | None = None,
    error_message: str | None = None,
    jd_analysis: dict | None = None,
    linkedin_summary: str | None = None,
    github_project_summary: list | None = None,
    gap_analysis: dict | None = None,
) -> None:
    session.status = status
    session.ats_score = ats_score
    session.ats_attempts = ats_attempts
    if ats_report is not None:
        session.ats_report = ats_report
    if error_message is not None:
        session.error_message = error_message
    if jd_analysis is not None:
        session.jd_analysis = jd_analysis
    if linkedin_summary is not None:
        session.linkedin_summary = linkedin_summary
    if github_project_summary is not None:
        session.github_project_summary = github_project_summary
    if gap_analysis is not None:
        session.gap_analysis = gap_analysis
    if status in ("done", "error"):
        session.completed_at = datetime.utcnow()
    session.updated_at = datetime.utcnow()
    resume_log.info(f"Updating session {session.session_id} status to '{status}' in the database")


async def create_version(
    db: AsyncSession,
    session: ResumeSession,
    user_input: str | None,
    resume_draft: dict,
    pdf_blob: bytes | None,
    ats_score: float,
    ats_report: dict | None,
) -> ResumeVersion:
    from sqlalchemy import func
    existing_count = await db.scalar(
        select(func.count()).where(ResumeVersion.session_id == session.id)
    )
    version_number = (existing_count or 0) + 1
    version = ResumeVersion(
        session_id=session.id,
        version_number=version_number,
        user_input=user_input,
        resume_draft=resume_draft,
        pdf_blob=pdf_blob,
        ats_score=ats_score,
        ats_report=ats_report,
    )
    db.add(version)
    await db.flush()
    resume_log.info(
        f"Saved resume version {version_number} for session {session.session_id} to the database"
    )
    return version


async def approve_version(
    db: AsyncSession,
    version: ResumeVersion,
    session_id_str: str,
) -> str:
    """Mark a version as approved, save PDF to disk, return file path."""
    if not version.pdf_blob:
        raise ValueError("No PDF blob on this version.")

    output_dir = Path(settings.OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = output_dir / f"resume_{session_id_str}_v{version.version_number}.pdf"
    pdf_path.write_bytes(version.pdf_blob)
    resume_log.info(f"Saved approved PDF to {pdf_path}")

    version.is_approved = True
    version.pdf_output_path = str(pdf_path)
    resume_log.info(f"Marked version {version.version_number} as approved in the database")
    return str(pdf_path)
