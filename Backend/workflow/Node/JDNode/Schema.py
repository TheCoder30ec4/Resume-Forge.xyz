"""Pydantic schema enforced as JDAgent's structured response.

The agent's tool-calling strategy validates against this — the prompt no longer
has to ask for JSON, and downstream code receives a typed Python object.
"""
import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator

# Allowed values are kept as data (not Literal types) so the JSON schema sent to
# the LLM does NOT carry a strict `enum`. A strict enum makes the model API reject
# the whole tool call when the model emits an off-list value (e.g. "senior/mid").
# Instead we accept a free string and normalize it ourselves below.
ROLE_LEVELS = ("junior", "mid", "senior", "staff", "principal")
EMPLOYMENT_TYPES = ("full-time", "contract", "internship")
WORK_MODES = ("remote", "hybrid", "onsite")


def _normalize_enum(value, allowed: tuple[str, ...]) -> Optional[str]:
    """Coerce a loose model-supplied string to one of `allowed`, else None.

    Handles combined answers like "senior/mid" or "remote, hybrid" by scanning
    tokens and returning the first that matches an allowed value.
    """
    if value is None:
        return None
    text = str(value).strip().lower()
    if text in allowed:
        return text
    for token in re.split(r"[\s/,|]+", text):
        if token in allowed:
            return token
    return None


class YearsExperience(BaseModel):
    minimum: int = Field(0, description="Minimum years required. 0 if not stated.")
    preferred: int = Field(0, description="Preferred years. 0 if not stated.")

    @field_validator("minimum", "preferred", mode="before")
    @classmethod
    def _none_to_zero(cls, v):
        """The model often emits null when a value isn't stated — treat as 0."""
        return 0 if v is None else v


class RoleIdentity(BaseModel):
    job_title: Optional[str] = Field(None, description="Verbatim from the posting. Null only if the JD has no clear title.")
    role_level: Optional[str] = Field(
        None,
        description=f"One of {ROLE_LEVELS}. Infer from title + context. Null only if truly indeterminate.",
    )
    years_experience_required: YearsExperience
    employment_type: Optional[str] = Field(
        None, description=f"One of {EMPLOYMENT_TYPES}. Null when the JD does not state it."
    )
    work_mode: Optional[str] = Field(
        None, description=f"One of {WORK_MODES}. Null when the JD does not state it."
    )

    @field_validator("role_level", mode="after")
    @classmethod
    def _validate_role_level(cls, v):
        return _normalize_enum(v, ROLE_LEVELS)

    @field_validator("employment_type", mode="after")
    @classmethod
    def _validate_employment_type(cls, v):
        return _normalize_enum(v, EMPLOYMENT_TYPES)

    @field_validator("work_mode", mode="after")
    @classmethod
    def _validate_work_mode(cls, v):
        return _normalize_enum(v, WORK_MODES)
    domain: Optional[str] = Field(
        None, description="e.g., fintech, healthtech, ML/AI. Null when ambiguous."
    )
    industry_keywords: list[str] = Field(default_factory=list)


class Skills(BaseModel):
    hard_skills_required: list[str] = Field(default_factory=list)
    hard_skills_preferred: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    tools_and_platforms: list[str] = Field(default_factory=list)
    frameworks_and_libraries: list[str] = Field(default_factory=list)
    methodologies: list[str] = Field(default_factory=list)
    certifications_required: list[str] = Field(default_factory=list)
    certifications_preferred: list[str] = Field(default_factory=list)


class AcronymPair(BaseModel):
    acronym: str
    expanded: str


class ATSExtractions(BaseModel):
    exact_phrases: list[str] = Field(
        default_factory=list,
        description="Multi-word, technically meaningful phrases. NEVER single words.",
    )
    acronym_pairs: list[AcronymPair] = Field(default_factory=list)
    keyword_frequency: dict[str, int] = Field(default_factory=dict)
    emphasized_terms: list[str] = Field(default_factory=list)


class ScopeIndicators(BaseModel):
    team_size: Optional[str] = None
    system_scale: Optional[str] = None
    user_count: Optional[str] = None


class ResponsibilitiesAndOutcomes(BaseModel):
    primary_responsibilities: list[str] = Field(default_factory=list)
    expected_outcomes: list[str] = Field(default_factory=list)
    scope_indicators: ScopeIndicators = Field(default_factory=ScopeIndicators)


class Qualifications(BaseModel):
    education_required: Optional[str] = None
    education_preferred: Optional[str] = None
    required_experience_types: list[str] = Field(default_factory=list)


class CulturalSignals(BaseModel):
    company_values: list[str] = Field(default_factory=list)
    team_context: Optional[str] = None
    red_flags: list[str] = Field(default_factory=list)


class JDAnalysis(BaseModel):
    """Structured analysis of a job description, produced by JDAgent.

    Only `role_identity` and `skills` are truly required — these always have signal
    in any JD. The remaining sections default to empty objects so short / unstructured
    JDs don't force the model to fabricate values just to satisfy the schema.
    """
    role_identity: RoleIdentity
    skills: Skills
    ats_extractions: ATSExtractions = Field(default_factory=ATSExtractions)
    responsibilities_and_outcomes: ResponsibilitiesAndOutcomes = Field(
        default_factory=ResponsibilitiesAndOutcomes
    )
    qualifications: Qualifications = Field(default_factory=Qualifications)
    cultural_signals: CulturalSignals = Field(default_factory=CulturalSignals)
