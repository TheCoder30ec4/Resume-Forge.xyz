from datetime import datetime
from pydantic import BaseModel


class StartResumeRequest(BaseModel):
    jd_text: str
    jd_url: str | None = None
    selected_github_repos: list[str]    # 2-10 "owner/repo"
    theme: str = "classic"
    user_input: str | None = None


class ReviseResumeRequest(BaseModel):
    user_input: str


class ApproveVersionRequest(BaseModel):
    version_id: str


class UpdateDraftRequest(BaseModel):
    resume_draft: dict


class ResumeVersionResponse(BaseModel):
    id: str
    version_number: int
    user_input: str | None
    ats_score: float
    is_approved: bool
    created_at: datetime
    resume_draft: dict | None = None

    class Config:
        from_attributes = True


class ResumeSessionResponse(BaseModel):
    id: str
    session_id: str
    status: str
    ats_score: float
    ats_attempts: int
    theme: str
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    error_message: str | None
    versions: list[ResumeVersionResponse] = []

    class Config:
        from_attributes = True
