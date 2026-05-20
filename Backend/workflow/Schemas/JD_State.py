from pydantic import BaseModel, Field
from typing import Literal, List, Optional, Dict


class YearsExperience(BaseModel):
    minimum: int = Field(description="Minimum number of years of experience required")
    preferred: int = Field(description="Preferred number of years of experience")


class RoleIdentity(BaseModel):
    job_title: str = Field(description="Exact title from the posting, verbatim (e.g., 'Senior Backend Engineer')")
    role_level: Literal["junior", "mid", "senior", "staff", "principal"] = Field(description="Seniority level")
    years_experience_required: YearsExperience
    employment_type: Literal["full-time", "contract", "internship"]
    work_mode: Literal["remote", "hybrid", "onsite"]
    domain: str = Field(description="e.g., fintech, healthtech, e-commerce, ML/AI, devtools")
    industry_keywords: List[str] = Field(description="Domain-specific terminology (e.g., 'PCI compliance', 'HIPAA', 'GAAP')")


class Skills(BaseModel):
    hard_skills_required: List[str] = Field(description="Must-have technical skills, verbatim from JD")
    hard_skills_preferred: List[str] = Field(description="Nice-to-have technical skills")
    soft_skills: List[str] = Field(description="Communication, leadership, mentoring — capture the JD's exact phrasing")
    tools_and_platforms: List[str] = Field(description="e.g., Jira, Datadog, Figma, Snowflake")
    frameworks_and_libraries: List[str] = Field(description="e.g., React, Django, PyTorch — kept separate from languages")
    methodologies: List[str] = Field(description="e.g., Agile, Scrum, TDD, CI/CD")
    certifications_required: List[str] = Field(default_factory=list, description="Required certs, e.g., AWS Solutions Architect")
    certifications_preferred: List[str] = Field(default_factory=list, description="Preferred certs")


class AcronymPair(BaseModel):
    acronym: str = Field(description="e.g., 'ML'")
    expanded: str = Field(description="e.g., 'Machine Learning'")


class ATSExtractions(BaseModel):
    exact_phrases: List[str] = Field(description="Multi-word phrases captured verbatim, e.g., 'end-to-end ownership'")
    acronym_pairs: List[AcronymPair] = Field(description="Acronym + expansion pairs so both forms appear on the resume")
    keyword_frequency: Dict[str, int] = Field(description="How many times each skill/keyword appears in the JD")
    emphasized_terms: List[str] = Field(description="Terms in section headers, bold, or repeated — signals genuine priority")


class ScopeIndicators(BaseModel):
    team_size: Optional[str] = Field(default=None, description="e.g., 'leading a team of 5'")
    system_scale: Optional[str] = Field(default=None, description="e.g., 'serving 10M users'")
    user_count: Optional[str] = Field(default=None, description="e.g., '10M monthly active users'")


class ResponsibilitiesAndOutcomes(BaseModel):
    primary_responsibilities: List[str] = Field(description="The 3–5 main 'you will do X' statements")
    expected_outcomes: List[str] = Field(description="Impact metrics the JD values, e.g., 'drive 30% improvement in...'")
    scope_indicators: ScopeIndicators


class Qualifications(BaseModel):
    education_required: Optional[str] = Field(default=None, description="e.g., 'BS in CS or equivalent experience'")
    education_preferred: Optional[str] = Field(default=None, description="e.g., 'Masters, PhD'")
    required_experience_types: List[str] = Field(description="Contextual experience requirements, e.g., 'B2B SaaS background'")


class CulturalSignals(BaseModel):
    company_values: List[str] = Field(default_factory=list, description="From 'About us' or culture sections")
    team_context: Optional[str] = Field(default=None, description="e.g., 'small startup team', 'established platform org'")
    red_flags: List[str] = Field(default_factory=list, description="e.g., 'fast-paced', 'wear many hats', equity-only comp")


class JD_Analysis(BaseModel):
    role_identity: RoleIdentity
    skills: Skills
    ats_extractions: ATSExtractions
    responsibilities_and_outcomes: ResponsibilitiesAndOutcomes
    qualifications: Qualifications
    cultural_signals: CulturalSignals
