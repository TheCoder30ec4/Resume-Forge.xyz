"""End-to-end workflow test.

Stubs every LLM agent + external tool so we exercise the full StateGraph
deterministically: parallel JD→GitHub+LinkedIn fan-out, gap analysis convergence,
ATS retry loop, user review (auto-approved), render, verify.

Run with:    uv run pytest tests/test_e2e_workflow.py
"""
import json
import shutil
from pathlib import Path

import pytest
from langchain_core.messages import AIMessage

import Backend.workflow.workflow as workflow_module
from Backend.workflow.Node.JDNode import Node as jd_node_module
from Backend.workflow.Node.JDNode.Schema import JDAnalysis
from Backend.workflow.Node.LinkedinNode import Node as linkedin_node_module
from Backend.workflow.Node.GithubNode import Node as github_node_module
from Backend.workflow.Node.GapAnalysisNode import Node as gap_node_module
from Backend.workflow.Node.ResumeWriteNode import Node as write_node_module
from Backend.workflow.Node.UserReviewNode import Node as review_node_module


pytestmark = pytest.mark.e2e


_JD_ANALYSIS = json.dumps({
    "role_identity": {
        "job_title": "Senior Backend Engineer",
        "role_level": "senior",
        "years_experience_required": {"minimum": 5, "preferred": 7},
        "employment_type": "full-time",
        "work_mode": "hybrid",
        "domain": "fintech",
        "industry_keywords": ["payments"],
    },
    "skills": {
        "hard_skills_required": ["Python", "PostgreSQL", "Docker"],
        "hard_skills_preferred": ["Kubernetes"],
        "soft_skills": [],
        "tools_and_platforms": [],
        "frameworks_and_libraries": ["FastAPI"],
        "methodologies": ["Agile"],
        "certifications_required": [],
        "certifications_preferred": [],
    },
    "ats_extractions": {
        "exact_phrases": ["end-to-end ownership"],
        "acronym_pairs": [],
        "keyword_frequency": {"Python": 3},
        "emphasized_terms": ["payments"],
    },
    "responsibilities_and_outcomes": {
        "primary_responsibilities": [],
        "expected_outcomes": [],
        "scope_indicators": {"team_size": None, "system_scale": None, "user_count": None},
    },
    "qualifications": {"education_required": None, "education_preferred": None, "required_experience_types": []},
    "cultural_signals": {"company_values": [], "team_context": None, "red_flags": []},
})


_LINKEDIN_SUMMARY = "Backend engineer, 6 years. Python, PostgreSQL, Docker, FastAPI. Payments at Acme."

_GITHUB_SUMMARY = json.dumps({
    "name": "payment-svc",
    "url": "https://github.com/u/payment-svc",
    "languages": ["Python"],
    "problem_statement": "Process payments at scale.",
    "solution": "FastAPI + asyncpg, see src/main.py.",
    "impact": "40% lower p99 latency.",
    "jd_alignment": "Python, FastAPI, payments.",
})

_GAP_ANALYSIS = json.dumps({
    "strong_matches": [{"requirement": "Python", "evidence": "6 yrs", "source": "linkedin"}],
    "weak_matches": [],
    "missing": [],
    "lead_with": ["Python", "FastAPI", "payments"],
    "red_flags": [],
})


# Resume that covers ALL JD keywords — passes ATS on first try
_RICH_RESUME = """cv:
  name: "Test User"
  social_networks:
    - network: LinkedIn
      username: testuser
    - network: GitHub
      username: testuser
  sections:
    summary:
      - "Senior backend engineer with end-to-end ownership of payments systems."
    experience:
      - company: "Acme"
        position: "Senior Backend Engineer"
        start_date: "2020-01"
        end_date: "present"
        highlights:
          - "Built Python FastAPI services on PostgreSQL with Docker and Kubernetes for payments processing in Agile sprints."
    skills:
      - label: "Stack"
        details: "Python, PostgreSQL, Docker, Kubernetes, FastAPI"
"""

# Resume that covers FEW keywords — fails first ATS attempt
_SPARSE_RESUME = """cv:
  name: "Test User"
  social_networks:
    - network: LinkedIn
      username: testuser
    - network: GitHub
      username: testuser
  sections:
    summary:
      - "Engineer."
    skills:
      - label: "Stack"
        details: "Python"
"""


class _StubAgent:
    """Reusable stub: returns a fixed string as the last AI message."""
    def __init__(self, content: str):
        self._content = content

    async def ainvoke(self, _state):
        return {"messages": [AIMessage(content=self._content)]}


class _StructuredStubAgent:
    """Stub for agents with `response_format` — returns a `structured_response`.

    JDAgent uses Pydantic structured output, so JDNode reads
    `result["structured_response"]` rather than the message content.
    """
    def __init__(self, structured):
        self._structured = structured

    async def ainvoke(self, _state):
        return {
            "messages": [AIMessage(content="")],
            "structured_response": self._structured,
        }


@pytest.fixture
def initial_state():
    return {
        "JD": "Senior Backend Engineer at fintech needing Python, PostgreSQL, Docker, FastAPI, Kubernetes.",
        "user_input": None,
        "session_id": "e2e-test",
        "LinkedinURL": "https://www.linkedin.com/in/e2e-test-user",
        "GithubRepos": ["u/payment-svc", "u/data-pipeline"],
        "GithubToken": None,
        "JDAnalysis": "",
        "LinkedinSummary": "",
        "GithubProjectSummary": [],
        "GapAnalysis": "",
        "ResumeDraft": "",
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


@pytest.fixture
def stub_all_agents(monkeypatch):
    """Stub every agent + tool so the test is hermetic."""
    monkeypatch.setattr(
        jd_node_module, "JDAgent",
        _StructuredStubAgent(JDAnalysis.model_validate_json(_JD_ANALYSIS)),
    )

    # LinkedinNode fetches the profile deterministically, then the agent analyzes it.
    monkeypatch.setattr(
        linkedin_node_module, "get_linkedin",
        lambda _url: [{"summary": "Backend engineer", "experience": [], "skills": ["Python"]}],
    )
    monkeypatch.setattr(linkedin_node_module, "LinkedinAgent", _StubAgent(_LINKEDIN_SUMMARY))

    # Github sub-workflow: user granted 2 repos → fetched directly, no LLM select.
    monkeypatch.setattr(github_node_module, "get_github_repos", lambda _names, _token: [
        {
            "name": "u/payment-svc",
            "description": "...",
            "languages": ["Python"],
            "topics": [],
            "stars": 100,
            "url": "https://github.com/u/payment-svc",
            "readme_excerpt": "...",
        },
        {
            "name": "u/data-pipeline",
            "description": "...",
            "languages": ["Python"],
            "topics": [],
            "stars": 50,
            "url": "https://github.com/u/data-pipeline",
            "readme_excerpt": "...",
        },
    ])

    async def fake_clone(_url):
        # Make a temp dir that exists but is empty; the agent is stubbed anyway
        import tempfile
        return tempfile.mkdtemp(prefix="fake_clone_")

    monkeypatch.setattr(github_node_module, "clone_repo", fake_clone)
    monkeypatch.setattr(github_node_module, "cleanup_repo", lambda p: shutil.rmtree(p, ignore_errors=True))
    monkeypatch.setattr(github_node_module, "make_summarize_agent", lambda _: _StubAgent(_GITHUB_SUMMARY))

    monkeypatch.setattr(gap_node_module, "GapAnalysisAgent", _StubAgent(_GAP_ANALYSIS))

    # Auto-approve user review
    async def auto_approve(state):
        state["UserApproved"] = True
        return state

    monkeypatch.setattr(review_node_module, "UserReviewNode", auto_approve)
    monkeypatch.setattr(workflow_module, "UserReviewNode", auto_approve)


async def test_workflow_passes_ats_on_first_attempt(monkeypatch, stub_all_agents, initial_state, tmp_path):
    """A resume that covers all JD keywords passes ATS, never retries, renders, verifies."""
    monkeypatch.chdir(tmp_path)

    monkeypatch.setattr(write_node_module, "ResumeWriteAgent", _StubAgent(_RICH_RESUME))

    workflow = workflow_module.build_workflow()
    final = await workflow.ainvoke(initial_state)

    # JDNode serializes the structured response, so compare semantically (key
    # order / null fields differ from the hand-written _JD_ANALYSIS string).
    assert json.loads(final["JDAnalysis"]) == JDAnalysis.model_validate_json(_JD_ANALYSIS).model_dump()
    assert final["LinkedinSummary"] == _LINKEDIN_SUMMARY
    assert len(final["GithubProjectSummary"]) == 2
    assert final["GapAnalysis"] == _GAP_ANALYSIS
    assert final["ATSAttempts"] == 1, "Should pass ATS on first try, never retry"
    assert final["ATSScore"] >= workflow_module.ATS_PASS_THRESHOLD
    assert final["UserApproved"] is True
    assert final["RenderedPDFPath"].endswith(".pdf")
    assert Path(final["RenderedPDFPath"]).exists()
    assert final["ParseBackOK"] is True


async def test_workflow_retries_on_low_ats_score(monkeypatch, stub_all_agents, initial_state, tmp_path):
    """A resume that misses keywords on first attempt should retry, then proceed."""
    monkeypatch.chdir(tmp_path)

    # First call returns sparse, second call returns rich (simulating writer learning from feedback)
    drafts = iter([_SPARSE_RESUME, _RICH_RESUME, _RICH_RESUME])

    class SequencedWriter:
        async def ainvoke(self, _state):
            return {"messages": [AIMessage(content=next(drafts))]}

    monkeypatch.setattr(write_node_module, "ResumeWriteAgent", SequencedWriter())

    workflow = workflow_module.build_workflow()
    final = await workflow.ainvoke(initial_state)

    assert final["ATSAttempts"] >= 2, "Sparse resume should trigger at least one retry"
    assert final["ATSScore"] >= workflow_module.ATS_PASS_THRESHOLD or final["ATSAttempts"] >= workflow_module.ATS_MAX_ATTEMPTS


async def test_workflow_gives_up_after_max_attempts(monkeypatch, stub_all_agents, initial_state, tmp_path):
    """If writer keeps producing sparse drafts, workflow stops after MAX_ATTEMPTS and proceeds to review anyway."""
    monkeypatch.chdir(tmp_path)

    monkeypatch.setattr(write_node_module, "ResumeWriteAgent", _StubAgent(_SPARSE_RESUME))

    workflow = workflow_module.build_workflow()
    final = await workflow.ainvoke(initial_state)

    assert final["ATSAttempts"] == workflow_module.ATS_MAX_ATTEMPTS
    assert final["ATSScore"] < workflow_module.ATS_PASS_THRESHOLD
    # Should still complete: render + verify ran
    assert final["RenderedPDFPath"]
    assert final["FinalSummary"]
