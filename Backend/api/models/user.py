import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.sqlite import JSON

from Backend.api.database.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)   # null for Google-only
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    auth_provider: Mapped[str] = mapped_column(
        SAEnum("email", "google", name="auth_provider_enum"),
        default="email",
        nullable=False,
    )
    google_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)

    # Session tokens (JWT refresh token stored hashed)
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    profile: Mapped["UserProfile"] = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    candidate_data: Mapped["CandidateData"] = relationship("CandidateData", back_populates="user", uselist=False, cascade="all, delete-orphan")
    github_connection: Mapped["GithubConnection"] = relationship("GithubConnection", back_populates="user", uselist=False, cascade="all, delete-orphan")
    linkedin_connection: Mapped["LinkedinConnection"] = relationship("LinkedinConnection", back_populates="user", uselist=False, cascade="all, delete-orphan")
    resume_sessions: Mapped[list["ResumeSession"]] = relationship("ResumeSession", back_populates="user", cascade="all, delete-orphan")
