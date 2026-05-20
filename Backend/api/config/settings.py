from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "ResumeBuilder"
    ENV: str = "development"          # development | production
    SECRET_KEY: str = "change-me-in-production"
    DEBUG: bool = True

    # ── Database ──────────────────────────────────────────────────────────────
    # SQLite for dev, Postgres for prod — controlled by ENV
    DATABASE_URL: str = "sqlite+aiosqlite:///./resumebuilder.db"
    # Postgres example: postgresql+asyncpg://user:pass@localhost/resumebuilder

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 3600          # 1 hour default TTL
    LINKEDIN_CACHE_TTL: int = 86400        # 24h — LinkedIn profile
    GITHUB_REPO_CACHE_TTL: int = 43200     # 12h — repo summaries

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Google OAuth ──────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"

    # ── GitHub OAuth ──────────────────────────────────────────────────────────
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/auth/github/callback"

    # ── LinkedIn / Apify ─────────────────────────────────────────────────────
    APIFY_API_KEY: str = ""

    # ── External AI ──────────────────────────────────────────────────────────
    GROQ_API_KEY: str = ""

    # ── Output ────────────────────────────────────────────────────────────────
    OUTPUT_DIR: str = "output"

    class Config:
        env_file = (".env", "Backend/.env")   # root .env first, then Backend/.env
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
