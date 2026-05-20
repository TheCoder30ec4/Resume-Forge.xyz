import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from Backend.api.database.base import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    website: Mapped[str | None] = mapped_column(Text, nullable=True)
    headline: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    skills: Mapped[list | None] = mapped_column(JSON, nullable=True)       # ["Python", "Docker", ...]

    # True → candidate has no work experience (onboarding "Fresher" toggle).
    # Drives the resume workflow to skip the experience section.
    is_fresher: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="profile")


class CandidateData(Base):
    """Structured resume building blocks extracted from LinkedIn + GitHub once,
    reused across all resume sessions to avoid re-generating every time."""

    __tablename__ = "candidate_data"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Structured blocks — each is a JSON array of objects
    education: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # [{"institution": "...", "degree": "B.Tech", "field": "...", "start": "2021-08", "end": "2025-05", "gpa": null}]

    experience: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # [{"company": "...", "title": "...", "start": "...", "end": "...", "location": "...", "bullets": [...]}]

    projects: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # [{"name": "...", "url": "...", "description": "...", "highlights": [...], "repo": "owner/repo"}]

    certifications: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # [{"name": "...", "issuer": "...", "date": "2025-10", "url": "..."}]

    skills: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # ["Python", "FastAPI", "Docker", ...]

    languages: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # [{"language": "English", "proficiency": "native"}]

    github_repo_summaries: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # {"owner/repo": {summary object}, ...} — all repos summarized in background

    last_extracted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="candidate_data")
