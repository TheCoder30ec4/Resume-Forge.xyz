from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    location: str | None = None
    phone: str | None = None
    website: str | None = None
    headline: str | None = None
    bio: str | None = None
    skills: list[str] | None = None
    is_fresher: bool | None = None


class UserProfileResponse(BaseModel):
    full_name: str | None
    location: str | None
    phone: str | None
    website: str | None
    headline: str | None
    bio: str | None
    skills: list[str] | None
    is_fresher: bool = False
    updated_at: datetime

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: str
    email: str
    name: str | None
    avatar_url: str | None
    auth_provider: str
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None
    profile: UserProfileResponse | None = None

    class Config:
        from_attributes = True


class LinkedinConnectRequest(BaseModel):
    linkedin_url: str       # e.g. https://linkedin.com/in/ch-varun


class GithubConnectRequest(BaseModel):
    code: str               # OAuth code from GitHub
    state: str | None = None
