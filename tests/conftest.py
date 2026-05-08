import json
import os
import pytest
from dotenv import load_dotenv

load_dotenv()


SAMPLE_JD_ANALYSIS = json.dumps({
    "role_identity": {
        "job_title": "Senior Backend Engineer",
        "role_level": "senior",
        "years_experience_required": {"minimum": 5, "preferred": 7},
        "employment_type": "full-time",
        "work_mode": "hybrid",
        "domain": "fintech",
        "industry_keywords": ["PCI compliance", "payments"],
    },
    "skills": {
        "hard_skills_required": ["Python", "PostgreSQL", "Docker"],
        "hard_skills_preferred": ["Kubernetes", "Terraform"],
        "soft_skills": ["mentoring"],
        "tools_and_platforms": ["Datadog"],
        "frameworks_and_libraries": ["FastAPI", "Django"],
        "methodologies": ["Agile", "CI/CD"],
        "certifications_required": [],
        "certifications_preferred": ["AWS Solutions Architect"],
    },
    "ats_extractions": {
        "exact_phrases": ["end-to-end ownership", "cross-functional collaboration"],
        "acronym_pairs": [{"acronym": "ML", "expanded": "Machine Learning"}],
        "keyword_frequency": {"Python": 3, "Docker": 2},
        "emphasized_terms": ["payments", "PCI compliance"],
    },
    "responsibilities_and_outcomes": {
        "primary_responsibilities": ["Lead backend services"],
        "expected_outcomes": ["30% latency reduction"],
        "scope_indicators": {"team_size": "5", "system_scale": None, "user_count": "5M"},
    },
    "qualifications": {
        "education_required": "BS in CS",
        "education_preferred": None,
        "required_experience_types": ["B2B SaaS"],
    },
    "cultural_signals": {
        "company_values": ["customer obsession"],
        "team_context": "fast-growing startup",
        "red_flags": [],
    },
})


SAMPLE_RESUME_YAML = """cv:
  name: "Test User"
  social_networks:
    - network: LinkedIn
      username: testuser
    - network: GitHub
      username: testuser
  sections:
    summary:
      - "Backend engineer with Python, PostgreSQL, and Docker experience in payments."
    experience:
      - company: "Acme"
        position: "Backend Engineer"
        start_date: "2022-01"
        end_date: "present"
        highlights:
          - "Built FastAPI services with Django ORM, PostgreSQL, Docker, Kubernetes for end-to-end ownership of billing."
    skills:
      - label: "Languages"
        details: "Python, Go"
"""


@pytest.fixture
def sample_jd_analysis() -> str:
    return SAMPLE_JD_ANALYSIS


@pytest.fixture
def sample_resume_yaml() -> str:
    return SAMPLE_RESUME_YAML


@pytest.fixture
def initial_state(sample_jd_analysis: str, sample_resume_yaml: str) -> dict:
    return {
        "JD": "Senior Backend Engineer at a fintech.",
        "user_input": None,
        "session_id": "test-session",
        "JDAnalysis": sample_jd_analysis,
        "LinkedinSummary": "5 years backend at Acme, built payment systems.",
        "GithubProjectSummary": [],
        "GapAnalysis": "",
        "ResumeDraft": sample_resume_yaml,
        "ResumeYAMLPath": "",
        "ATSScore": 0.0,
        "ATSReport": "",
        "ATSAttempts": 0,
        "UserApproved": False,
        "Theme": "sb2nov",
        "RenderedPDFPath": "",
        "ParseBackOK": False,
        "FinalSummary": "",
    }


def has_groq_key() -> bool:
    return bool(os.getenv("GROQ_API") or os.getenv("GROQ_API_KEY"))


requires_groq = pytest.mark.skipif(
    not has_groq_key(),
    reason="GROQ_API not set; skipping integration test that calls a real LLM",
)
