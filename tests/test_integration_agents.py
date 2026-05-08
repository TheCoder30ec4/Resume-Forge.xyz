"""Integration tests — call real Groq endpoints. Marked `integration`, skipped without GROQ_API.

Run with:    uv run pytest -m integration
Skip with:   uv run pytest -m "not integration"
"""
import json

import pytest
from langchain_core.messages import HumanMessage

from tests.conftest import requires_groq

pytestmark = pytest.mark.integration


_SAMPLE_JD = """Senior Backend Engineer — Fintech Payments

Requirements:
- 5+ years backend experience
- Python (required), PostgreSQL (required), Docker (required)
- PCI compliance experience

Nice to have:
- Kubernetes, Terraform
- Machine Learning (ML) for fraud detection
"""


@requires_groq
async def test_jd_agent_produces_valid_json():
    from app.Node.JDNode.Agent import JDAgent
    result = await JDAgent.ainvoke(
        {"messages": [HumanMessage(content=f"<job_description>\n{_SAMPLE_JD}\n</job_description>")]}
    )
    raw = result["messages"][-1].content
    parsed = json.loads(raw)
    assert "role_identity" in parsed
    assert "skills" in parsed
    assert "Python" in parsed["skills"]["hard_skills_required"]
    assert "PostgreSQL" in parsed["skills"]["hard_skills_required"]
    assert "Docker" in parsed["skills"]["hard_skills_required"]


@requires_groq
async def test_jd_agent_extracts_role_level():
    from app.Node.JDNode.Agent import JDAgent
    result = await JDAgent.ainvoke(
        {"messages": [HumanMessage(content=f"<job_description>\n{_SAMPLE_JD}\n</job_description>")]}
    )
    parsed = json.loads(result["messages"][-1].content)
    assert parsed["role_identity"]["role_level"] == "senior"
    assert parsed["role_identity"]["domain"] in ["fintech", "payments", "Fintech", "Financial Services"]


@requires_groq
async def test_gap_analysis_agent_runs(sample_jd_analysis):
    from app.Node.GapAnalysisNode.Agent import GapAnalysisAgent
    user_input = (
        f"## JD Analysis\n{sample_jd_analysis}"
        f"\n\n## LinkedIn Summary\n5 years backend at Acme. Python, Django, PostgreSQL, Docker."
        f"\n\n## GitHub Projects\n(none)"
    )
    result = await GapAnalysisAgent.ainvoke(
        {"messages": [HumanMessage(content=user_input)]}
    )
    raw = result["messages"][-1].content
    parsed = json.loads(raw)
    assert "strong_matches" in parsed
    assert "missing" in parsed


@requires_groq
async def test_resume_writer_produces_yaml(sample_jd_analysis):
    from app.Node.ResumeWriteNode.Agent import ResumeWriteAgent
    sections = [
        f"## JD Analysis\n{sample_jd_analysis}",
        "## LinkedIn Summary\nVarun, 3 years backend, Python/PostgreSQL/Docker.",
        "## GitHub Projects\n(none)",
        '## Gap Analysis\n{"strong_matches":[{"requirement":"Python","evidence":"3 yrs","source":"linkedin"}],"missing":[]}',
    ]
    result = await ResumeWriteAgent.ainvoke(
        {"messages": [HumanMessage(content="\n\n".join(sections))]}
    )
    yaml_text = result["messages"][-1].content
    assert "cv:" in yaml_text
    assert "name:" in yaml_text
    assert "design:" not in yaml_text  # writer must NOT emit design block
