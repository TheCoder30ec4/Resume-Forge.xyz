"""Unit tests for ATSValidatorNode — pure deterministic scoring, no LLM."""
import json
import pytest

from Backend.workflow.Node.ATSValidatorNode.Node import ATSValidatorNode, _extract_keywords, _keyword_in_text


def test_extract_keywords_pulls_all_categories(sample_jd_analysis):
    keywords = _extract_keywords(sample_jd_analysis)
    # hard_skills_required + preferred + frameworks + tools + industry + exact_phrases + emphasized
    assert "Python" in keywords
    assert "PostgreSQL" in keywords
    assert "Kubernetes" in keywords
    assert "FastAPI" in keywords
    assert "Datadog" in keywords
    assert "PCI compliance" in keywords
    assert "end-to-end ownership" in keywords


def test_extract_keywords_dedupes_case_insensitive():
    raw = json.dumps({
        "skills": {
            "hard_skills_required": ["Python", "python", "PYTHON"],
            "hard_skills_preferred": [],
            "frameworks_and_libraries": [],
            "tools_and_platforms": [],
        },
        "role_identity": {"industry_keywords": []},
        "ats_extractions": {"exact_phrases": [], "emphasized_terms": []},
    })
    keywords = _extract_keywords(raw)
    assert sum(1 for k in keywords if k.lower() == "python") == 1


def test_extract_keywords_handles_malformed_json():
    assert _extract_keywords("not valid json") == []
    assert _extract_keywords("") == []


def test_keyword_in_text_word_boundary():
    text = "i used python and postgresql"
    assert _keyword_in_text("Python", text) is True
    assert _keyword_in_text("PostgreSQL", text) is True
    # Java should NOT match javascript
    assert _keyword_in_text("Java", "i used javascript") is False


def test_keyword_in_text_multi_word_phrase():
    text = "owned end-to-end ownership of the pipeline"
    assert _keyword_in_text("end-to-end ownership", text) is True


async def test_ats_validator_scoring(initial_state):
    update = await ATSValidatorNode(initial_state)
    assert 0.0 <= update["ATSScore"] <= 1.0
    assert update["ATSAttempts"] == 1
    assert "Coverage:" in update["ATSReport"]


async def test_ats_validator_increments_attempts(initial_state):
    state = dict(initial_state)
    for expected in (1, 2, 3):
        update = await ATSValidatorNode(state)
        state.update(update)
        assert state["ATSAttempts"] == expected


async def test_ats_validator_zero_score_for_unrelated_resume(sample_jd_analysis):
    state = {
        "JDAnalysis": sample_jd_analysis,
        "ResumeDraft": "I love painting watercolors and walking dogs.",
        "ATSAttempts": 0,
    }
    update = await ATSValidatorNode(state)
    assert update["ATSScore"] == 0.0
    assert "Missing:" in update["ATSReport"]


async def test_ats_validator_no_keywords_returns_zero():
    state = {
        "JDAnalysis": "{}",
        "ResumeDraft": "Anything here.",
        "ATSAttempts": 0,
    }
    update = await ATSValidatorNode(state)
    assert update["ATSScore"] == 0.0
    assert "No keywords" in update["ATSReport"]
