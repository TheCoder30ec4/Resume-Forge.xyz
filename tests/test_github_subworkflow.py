"""Tests for the GithubNode internal sub-workflow.

The fetch step is mocked (no real GitHub API), and clone_repo is mocked to
return a synthetic repo on disk so we can exercise the sub-graph deterministically.
The select and summarize steps stay as real LLM calls under the `integration`
mark, or use a tiny stub agent for unit-style coverage.
"""
import json
from pathlib import Path

import pytest
from langchain_core.messages import HumanMessage, AIMessage

from app.Node.GithubNode import Node as github_node_module


_FAKE_REPOS = [
    {
        "name": "payment-service",
        "description": "Async payment processing microservice in Python",
        "languages": ["Python"],
        "topics": ["fintech", "payments"],
        "stars": 142,
        "url": "https://github.com/fake-user/payment-service",
        "readme_excerpt": "# Payment Service\n\nFastAPI + PostgreSQL service handling 5M+ daily transactions. Reduced latency by 40% via connection pooling.",
    },
    {
        "name": "ml-tutorial",
        "description": "Notebook tutorial for ML beginners",
        "languages": ["Jupyter Notebook"],
        "topics": ["education"],
        "stars": 3,
        "url": "https://github.com/fake-user/ml-tutorial",
        "readme_excerpt": "Tutorial repo, follow notebooks 1-10.",
    },
    {
        "name": "infra-toolkit",
        "description": "Kubernetes deployment helpers",
        "languages": ["Go", "Shell"],
        "topics": ["devops", "kubernetes"],
        "stars": 78,
        "url": "https://github.com/fake-user/infra-toolkit",
        "readme_excerpt": "# Infra Toolkit\n\nCLI for managing K8s clusters. Used by 3 teams in production.",
    },
]


def _make_synthetic_repo(tmp_path: Path, name: str) -> Path:
    """Create a fake clone on disk with README + source so the summarize agent has something to walk."""
    repo = tmp_path / name
    repo.mkdir()
    (repo / "README.md").write_text(
        f"# {name}\n\n"
        "FastAPI service for payments. Uses PostgreSQL via asyncpg. "
        "Handles 5M+ transactions per day with 40% lower p99 latency than the previous Java service."
    )
    (repo / "pyproject.toml").write_text(
        '[project]\nname = "payment-service"\ndependencies = ["fastapi", "asyncpg", "uvicorn"]\n'
    )
    src = repo / "src"
    src.mkdir()
    (src / "main.py").write_text(
        "from fastapi import FastAPI\napp = FastAPI()\n@app.post('/pay')\nasync def pay(): return {}\n"
    )
    return repo


async def test_fetch_node_uses_get_github_repos(monkeypatch):
    monkeypatch.setattr(github_node_module, "get_github_repos", lambda: _FAKE_REPOS)
    state = {
        "JDAnalysis": "{}",
        "AllRepos": [],
        "SelectedNames": [],
        "Summaries": [],
        "user_input": None,
    }
    result = await github_node_module._fetch_node(state)
    assert result["AllRepos"] == _FAKE_REPOS


async def test_select_node_falls_back_when_llm_returns_garbage(monkeypatch, sample_jd_analysis):
    """If GithubSelectAgent returns non-JSON, we fall back to first 3 repos."""
    class StubAgent:
        async def ainvoke(self, _):
            return {"messages": [AIMessage(content="not valid json")]}

    monkeypatch.setattr(github_node_module, "GithubSelectAgent", StubAgent())
    state = {
        "JDAnalysis": sample_jd_analysis,
        "AllRepos": _FAKE_REPOS,
        "SelectedNames": [],
        "Summaries": [],
        "user_input": None,
    }
    result = await github_node_module._select_node(state)
    assert result["SelectedNames"] == ["payment-service", "ml-tutorial", "infra-toolkit"]


async def test_select_node_handles_no_repos(sample_jd_analysis):
    state = {
        "JDAnalysis": sample_jd_analysis,
        "AllRepos": [],
        "SelectedNames": [],
        "Summaries": [],
        "user_input": None,
    }
    result = await github_node_module._select_node(state)
    assert result["SelectedNames"] == []


async def test_select_node_parses_valid_json(monkeypatch, sample_jd_analysis):
    class StubAgent:
        async def ainvoke(self, _):
            return {"messages": [AIMessage(content='["payment-service", "infra-toolkit"]')]}

    monkeypatch.setattr(github_node_module, "GithubSelectAgent", StubAgent())
    state = {
        "JDAnalysis": sample_jd_analysis,
        "AllRepos": _FAKE_REPOS,
        "SelectedNames": [],
        "Summaries": [],
        "user_input": None,
    }
    result = await github_node_module._select_node(state)
    assert result["SelectedNames"] == ["payment-service", "infra-toolkit"]
    assert "ml-tutorial" not in result["SelectedNames"]


async def test_summarize_one_handles_clone_failure(monkeypatch):
    """If clone fails, summarize_one returns a stub summary, never raises."""
    async def fake_clone(_url):
        raise RuntimeError("simulated network failure")

    monkeypatch.setattr(github_node_module, "clone_repo", fake_clone)

    summary = await github_node_module._summarize_one(_FAKE_REPOS[0], "{}")
    assert summary["name"] == "payment-service"
    assert "failed" in summary["solution"].lower()


async def test_summarize_one_walks_synthetic_repo(monkeypatch, tmp_path):
    """End-to-end summarize_one with a real on-disk repo (clone mocked) and a stubbed agent."""
    repo_path = _make_synthetic_repo(tmp_path, "payment-service")

    async def fake_clone(_url):
        return str(repo_path)

    monkeypatch.setattr(github_node_module, "clone_repo", fake_clone)
    monkeypatch.setattr(github_node_module, "cleanup_repo", lambda _: None)

    expected = {
        "name": "payment-service",
        "url": "https://github.com/fake-user/payment-service",
        "languages": ["Python"],
        "problem_statement": "Process payments at scale.",
        "solution": "FastAPI + asyncpg, see src/main.py.",
        "impact": "40% lower p99 latency, 5M+ daily tx.",
        "jd_alignment": "Python, PostgreSQL, payments domain.",
    }

    class StubAgent:
        async def ainvoke(self, _):
            return {"messages": [AIMessage(content=json.dumps(expected))]}

    monkeypatch.setattr(github_node_module, "make_summarize_agent", lambda _path: StubAgent())

    summary = await github_node_module._summarize_one(_FAKE_REPOS[0], "{}")
    assert summary == expected


async def test_subgraph_runs_end_to_end(monkeypatch, tmp_path, sample_jd_analysis):
    """Full sub-graph: fetch (mocked) → select (stubbed) → summarize (stubbed agent + real fs)."""
    monkeypatch.setattr(github_node_module, "get_github_repos", lambda: _FAKE_REPOS)

    class SelectStub:
        async def ainvoke(self, _):
            return {"messages": [AIMessage(content='["payment-service"]')]}

    monkeypatch.setattr(github_node_module, "GithubSelectAgent", SelectStub())

    repo_path = _make_synthetic_repo(tmp_path, "payment-service")

    async def fake_clone(_url):
        return str(repo_path)

    monkeypatch.setattr(github_node_module, "clone_repo", fake_clone)
    monkeypatch.setattr(github_node_module, "cleanup_repo", lambda _: None)

    summary_payload = {
        "name": "payment-service",
        "url": "https://github.com/fake-user/payment-service",
        "languages": ["Python"],
        "problem_statement": "P",
        "solution": "S",
        "impact": "I",
        "jd_alignment": "A",
    }

    class SummarizeStub:
        async def ainvoke(self, _):
            return {"messages": [AIMessage(content=json.dumps(summary_payload))]}

    monkeypatch.setattr(github_node_module, "make_summarize_agent", lambda _: SummarizeStub())

    state = {
        "JD": "...",
        "user_input": None,
        "session_id": "t",
        "JDAnalysis": sample_jd_analysis,
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
    update = await github_node_module.GithubNode(state)
    assert len(update["GithubProjectSummary"]) == 1
    parsed = json.loads(update["GithubProjectSummary"][0]["projectSummary"])
    assert parsed["name"] == "payment-service"
    assert parsed["problem_statement"] == "P"
