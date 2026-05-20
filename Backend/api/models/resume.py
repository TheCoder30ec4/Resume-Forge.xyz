import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Text, Float, Integer, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, LargeBinary

from Backend.api.database.base import Base


class ResumeSession(Base):
    """One session = one JD + one LangGraph thread.
    Multiple ResumeVersions are created as the user revises."""

    __tablename__ = "resume_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # LangGraph thread_id — used to restore checkpoint state
    session_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    # Job description inputs
    jd_text: Mapped[str] = mapped_column(Text, nullable=False)
    jd_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Inputs from frontend
    selected_github_repos: Mapped[list | None] = mapped_column(JSON, nullable=True)  # ["owner/repo", ...]
    theme: Mapped[str] = mapped_column(String(50), default="classic")
    user_input: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Cached pipeline outputs — reused on revise to skip re-running upstream nodes
    jd_analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    linkedin_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    github_project_summary: Mapped[list | None] = mapped_column(JSON, nullable=True)
    gap_analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Current best ATS result
    ats_score: Mapped[float] = mapped_column(Float, default=0.0)
    ats_attempts: Mapped[int] = mapped_column(Integer, default=0)
    ats_report: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    status: Mapped[str] = mapped_column(
        SAEnum("pending", "running", "done", "error", name="session_status_enum"),
        default="pending",
        nullable=False,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="resume_sessions")
    versions: Mapped[list["ResumeVersion"]] = relationship(
        "ResumeVersion", back_populates="session",
        cascade="all, delete-orphan",
        order_by="ResumeVersion.version_number",
    )


class ResumeVersion(Base):
    """Each write or revise call creates a new version row.
    User can view history and approve a specific version."""

    __tablename__ = "resume_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("resume_sessions.id", ondelete="CASCADE"), nullable=False, index=True)

    version_number: Mapped[int] = mapped_column(Integer, nullable=False)     # 1, 2, 3 ...
    user_input: Mapped[str | None] = mapped_column(Text, nullable=True)      # what the user asked for this version

    # Resume content
    resume_draft: Mapped[dict | None] = mapped_column(JSON, nullable=True)   # full cv: JSON
    pdf_blob: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)  # binary PDF in DB
    pdf_output_path: Mapped[str | None] = mapped_column(Text, nullable=True)    # path on disk when approved

    # ATS result for this version
    ats_score: Mapped[float] = mapped_column(Float, default=0.0)
    ats_report: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["ResumeSession"] = relationship("ResumeSession", back_populates="versions")
