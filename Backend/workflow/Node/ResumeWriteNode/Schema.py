from typing import Optional
from pydantic import BaseModel


class SocialNetwork(BaseModel):
    network: str
    username: str


class ExperienceEntry(BaseModel):
    company: str
    position: str
    start_date: str
    end_date: str
    location: Optional[str] = None
    highlights: list[str]


class ProjectEntry(BaseModel):
    name: str
    date: Optional[str] = None
    summary: Optional[str] = None
    highlights: list[str]


class SkillEntry(BaseModel):
    label: str
    details: str


class EducationEntry(BaseModel):
    institution: str
    area: str
    degree: str
    start_date: str
    end_date: str


class CertificationEntry(BaseModel):
    name: str
    date: Optional[str] = None
    issuer: Optional[str] = None
    url: Optional[str] = None


class ResumeSections(BaseModel):
    # Declaration order = render order: Education, Experience, Projects, Skills, Certifications.
    education: list[EducationEntry]
    experience: list[ExperienceEntry] = []
    projects: Optional[list[ProjectEntry]] = None
    skills: list[SkillEntry]
    certifications: Optional[list[CertificationEntry]] = None


class ResumeContent(BaseModel):
    name: str
    location: Optional[str] = None
    email: Optional[str] = None
    social_networks: Optional[list[SocialNetwork]] = None
    sections: ResumeSections
