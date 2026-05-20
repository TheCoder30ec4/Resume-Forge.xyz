import json
import re
from collections import Counter
from langchain_core.messages import HumanMessage, SystemMessage
from .Agent import ATSFeedbackModel, ATS_SYSTEM_PROMPT
from ...Schemas.State import State
from ...utils.LLM import strip_think

# Weights for keyword coverage categories.
_WEIGHTS = {
    "hard_skills_required": 3.0,
    "frameworks_and_libraries": 2.0,
    "tools_and_platforms": 2.0,
    "exact_phrases": 2.0,
    "hard_skills_preferred": 1.0,
    "soft_skills": 0.5,
    "emphasized_terms": 1.0,
}

# Weight of each sub-score in the final composite.
_COMPOSITE_WEIGHTS = {
    "keyword_coverage": 0.50,
    "verb_quality":     0.30,
    "word_variety":     0.20,
}

# Strong action verbs ATS expects bullets to start with.
_ACTION_VERBS = {
    "accelerated", "achieved", "architected", "automated", "built", "championed",
    "collaborated", "created", "cut", "debugged", "decreased", "delivered",
    "deployed", "designed", "developed", "drove", "eliminated", "enabled",
    "engineered", "enhanced", "established", "evaluated", "executed", "expanded",
    "founded", "generated", "grew", "implemented", "improved", "increased",
    "integrated", "introduced", "launched", "led", "mentored", "migrated",
    "modernized", "optimized", "orchestrated", "owned", "partnered", "piloted",
    "profiled", "prototyped", "reduced", "refactored", "resolved", "scaled",
    "shipped", "simplified", "spearheaded", "streamlined", "tested",
    "transformed", "validated",
}

# Common English stop-words — ignored in repetition analysis.
_STOP_WORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "shall",
    "i", "we", "you", "he", "she", "it", "they", "this", "that",
    "my", "our", "your", "their", "its", "which", "who", "what",
    "across", "using", "through", "into", "over", "up", "out",
}


# ── helpers ──────────────────────────────────────────────────────────────────

def _extract_keywords_by_category(jd_analysis: str) -> dict[str, list[str]]:
    try:
        data = json.loads(jd_analysis)
    except (json.JSONDecodeError, TypeError):
        return {}

    skills = data.get("skills", {})
    ats = data.get("ats_extractions", {})

    raw: dict[str, list[str]] = {
        "hard_skills_required": skills.get("hard_skills_required") or [],
        "hard_skills_preferred": skills.get("hard_skills_preferred") or [],
        "frameworks_and_libraries": skills.get("frameworks_and_libraries") or [],
        "tools_and_platforms": skills.get("tools_and_platforms") or [],
        "soft_skills": skills.get("soft_skills") or [],
        "exact_phrases": ats.get("exact_phrases") or [],
        "emphasized_terms": ats.get("emphasized_terms") or [],
    }

    seen: set[str] = set()
    deduped: dict[str, list[str]] = {}
    for cat in sorted(raw, key=lambda c: -_WEIGHTS.get(c, 1.0)):
        deduped[cat] = []
        for kw in raw[cat]:
            norm = kw.strip().lower()
            if norm and norm not in seen:
                seen.add(norm)
                deduped[cat].append(kw.strip())
    return deduped


def _keyword_in_text(keyword: str, text_lower: str) -> bool:
    pattern = r"\b" + re.escape(keyword.lower()) + r"\b"
    return bool(re.search(pattern, text_lower))


def _extract_bullets(resume_draft: str) -> list[str]:
    """Return every achievement-highlight string from the resume JSON.

    Only `highlights` entries are returned. Summary paragraphs (the `summary`
    section and entry-level `summary` fields) are prose, not achievement
    bullets — verb-quality and variety checks must not penalise them for
    failing to start with an action verb.
    """
    bullets: list[str] = []
    try:
        data = json.loads(resume_draft)
        cv = data.get("cv", data)
        sections = cv.get("sections", {})
        for section_items in sections.values():
            if not isinstance(section_items, list):
                continue
            for item in section_items:
                if isinstance(item, dict):
                    for h in item.get("highlights", []):
                        if isinstance(h, str):
                            bullets.append(h)
    except (json.JSONDecodeError, TypeError):
        pass
    return bullets


def _resume_text_lower(resume_draft: str) -> str:
    try:
        return json.dumps(json.loads(resume_draft)).lower()
    except (json.JSONDecodeError, TypeError):
        return resume_draft.lower()


def _evidence_text(state: State) -> str:
    parts = [state.get("LinkedinSummary", "")]
    for proj in state.get("GithubProjectSummary", []):
        parts.append(proj.get("projectSummary", ""))
    return " ".join(parts).lower()


# ── sub-scores ────────────────────────────────────────────────────────────────

def _keyword_coverage_score(
    keywords_by_cat: dict[str, list[str]], resume_lower: str
) -> tuple[float, dict]:
    total_w = earned_w = 0.0
    breakdown: dict[str, dict] = {}
    for cat, keywords in keywords_by_cat.items():
        if not keywords:
            continue
        w = _WEIGHTS.get(cat, 1.0)
        matched = [kw for kw in keywords if _keyword_in_text(kw, resume_lower)]
        missing = [kw for kw in keywords if not _keyword_in_text(kw, resume_lower)]
        total_w += w * len(keywords)
        earned_w += w * len(matched)
        breakdown[cat] = {"matched": matched, "missing": missing, "weight": w}
    score = earned_w / total_w if total_w > 0 else 0.0
    return round(score, 3), breakdown


def _verb_quality_score(bullets: list[str]) -> tuple[float, list[str], list[str]]:
    """Score 0-1: fraction of bullets that start with a strong action verb.

    Returns (score, good_bullets, bad_bullets).
    """
    if not bullets:
        return 1.0, [], []
    good, bad = [], []
    for b in bullets:
        first_word = re.split(r"\W+", b.strip())[0].lower() if b.strip() else ""
        if first_word in _ACTION_VERBS:
            good.append(b)
        else:
            bad.append(b)
    score = len(good) / len(bullets)
    return round(score, 3), good, bad


def _word_variety_score(bullets: list[str]) -> tuple[float, list[tuple[str, int]]]:
    """Score 0-1: penalises overused non-trivial words.

    A word used more than once in bullets is considered repetitive.
    Score = unique meaningful words / total meaningful words.
    Also returns the top repeated words for the report.
    """
    if not bullets:
        return 1.0, []

    all_words: list[str] = []
    for b in bullets:
        tokens = re.split(r"\W+", b.lower())
        for t in tokens:
            if t and t not in _STOP_WORDS and len(t) > 2:
                all_words.append(t)

    if not all_words:
        return 1.0, []

    counts = Counter(all_words)
    unique_count = sum(1 for c in counts.values() if c == 1)
    score = unique_count / len(counts)

    # Top overused words (count > 1), sorted by frequency.
    overused = sorted(
        [(w, c) for w, c in counts.items() if c > 1],
        key=lambda x: -x[1],
    )[:10]

    return round(score, 3), overused


# ── composite & formatting ────────────────────────────────────────────────────

def _composite_score(kw: float, verb: float, variety: float) -> float:
    return round(
        kw * _COMPOSITE_WEIGHTS["keyword_coverage"]
        + verb * _COMPOSITE_WEIGHTS["verb_quality"]
        + variety * _COMPOSITE_WEIGHTS["word_variety"],
        3,
    )


def _split_missing_by_evidence(
    breakdown: dict, evidence_lower: str
) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    actionable: dict[str, list[str]] = {}
    not_evidenced: dict[str, list[str]] = {}
    for cat, data in breakdown.items():
        act, no_ev = [], []
        for kw in data["missing"]:
            (act if _keyword_in_text(kw, evidence_lower) else no_ev).append(kw)
        if act:
            actionable[cat] = act
        if no_ev:
            not_evidenced[cat] = no_ev
    return actionable, not_evidenced


def _format_full_report(
    composite: float,
    kw_score: float,
    kw_breakdown: dict,
    verb_score: float,
    bad_bullets: list[str],
    variety_score: float,
    overused: list[tuple[str, int]],
    actionable: dict[str, list[str]],
    not_evidenced: dict[str, list[str]],
) -> str:
    lines = [
        f"## ATS Score: {composite:.1%}",
        f"  Keyword Coverage: {kw_score:.1%} (weight 50%)",
        f"  Verb Quality:     {verb_score:.1%} (weight 30%)",
        f"  Word Variety:     {variety_score:.1%} (weight 20%)",
        "",
    ]

    lines.append("### Keyword Coverage")
    for cat, data in kw_breakdown.items():
        label = cat.replace("_", " ").title()
        total = len(data["matched"]) + len(data["missing"])
        lines.append(f"  {label} ({data['weight']}x) — {len(data['matched'])}/{total}")
        if data["matched"]:
            lines.append(f"    Matched: {', '.join(data['matched'])}")
        if data["missing"]:
            lines.append(f"    Missing: {', '.join(data['missing'])}")

    lines.append("")
    lines.append("### Verb Quality")
    if bad_bullets:
        lines.append(f"  {len(bad_bullets)} bullet(s) do NOT start with a strong action verb:")
        for b in bad_bullets:
            lines.append(f"    ✗ {b[:120]}")
    else:
        lines.append("  All bullets start with a strong action verb. ✓")

    lines.append("")
    lines.append("### Word Variety")
    if overused:
        lines.append("  Overused words (appear more than once — vary these):")
        for word, count in overused:
            lines.append(f"    '{word}' used {count}x")
    else:
        lines.append("  No significant word repetition detected. ✓")

    lines.append("")
    if actionable:
        lines.append("### Actionable Gaps (candidate HAS evidence — writer MUST add)")
        for cat, kws in actionable.items():
            lines.append(f"  {cat.replace('_', ' ').title()}: {', '.join(kws)}")
    else:
        lines.append("### Actionable Gaps\n  All evidenced keywords are present. ✓")

    lines.append("")
    if not_evidenced:
        lines.append("### Unevidenced Gaps (do NOT add — no evidence for these)")
        for cat, kws in not_evidenced.items():
            lines.append(f"  {cat.replace('_', ' ').title()}: {', '.join(kws)}")

    return "\n".join(lines)


# ── main node ─────────────────────────────────────────────────────────────────

async def ATSValidatorNode(state: State) -> dict:
    keywords_by_cat = _extract_keywords_by_category(state["JDAnalysis"])
    resume_lower = _resume_text_lower(state["ResumeDraft"])
    bullets = _extract_bullets(state["ResumeDraft"])
    evidence_lower = _evidence_text(state)
    next_attempts = state.get("ATSAttempts", 0) + 1

    if not any(keywords_by_cat.values()):
        return {
            "ATSScore": 0.0,
            "ATSReport": "No keywords extracted from JD analysis — cannot validate.",
            "ATSAttempts": next_attempts,
        }

    kw_score, kw_breakdown = _keyword_coverage_score(keywords_by_cat, resume_lower)
    verb_score, _, bad_bullets = _verb_quality_score(bullets)
    variety_score, overused = _word_variety_score(bullets)
    composite = _composite_score(kw_score, verb_score, variety_score)

    actionable, not_evidenced = _split_missing_by_evidence(kw_breakdown, evidence_lower)

    score_report = _format_full_report(
        composite, kw_score, kw_breakdown,
        verb_score, bad_bullets,
        variety_score, overused,
        actionable, not_evidenced,
    )

    # Build LLM input — includes all three dimensions + evidenced-only gaps.
    actionable_block = (
        "Keywords the candidate HAS evidence for but are missing from the resume "
        "(the writer MUST add these):\n"
        + "\n".join(f"  {c.replace('_',' ').title()}: {', '.join(kws)}" for c, kws in actionable.items())
        if actionable else
        "All evidenced keywords are already present in the resume."
    )
    not_evidenced_block = (
        "Keywords with NO evidence in LinkedIn/GitHub (do NOT add these):\n"
        + "\n".join(f"  {c.replace('_',' ').title()}: {', '.join(kws)}" for c, kws in not_evidenced.items())
        if not_evidenced else "None."
    )
    bad_bullets_block = (
        "Bullets that do NOT start with a strong action verb (fix all of these):\n"
        + "\n".join(f"  - {b[:150]}" for b in bad_bullets)
        if bad_bullets else
        "All bullets start with strong action verbs. ✓"
    )
    overused_block = (
        "Overused words — each should appear at most once across all bullets:\n"
        + "\n".join(f"  '{w}' used {c}x" for w, c in overused)
        if overused else
        "No significant word repetition. ✓"
    )

    agent_input = "\n\n".join([
        f"## Composite ATS Score: {composite:.1%} (threshold 90%)\n{score_report}",
        f"## Actionable Gaps (evidenced, must fix)\n{actionable_block}",
        f"## Unevidenced Gaps (do NOT add)\n{not_evidenced_block}",
        f"## Verb Quality Issues\n{bad_bullets_block}",
        f"## Word Repetition Issues\n{overused_block}",
        f"## Resume Draft (JSON)\n{state['ResumeDraft']}",
        f"## JD Analysis\n{state['JDAnalysis']}",
        f"## Candidate Evidence\n{state.get('LinkedinSummary', '')}",
    ])

    result = await ATSFeedbackModel.ainvoke([
        SystemMessage(content=ATS_SYSTEM_PROMPT),
        HumanMessage(content=agent_input),
    ])

    llm_feedback = strip_think(result.content)
    full_report = f"{score_report}\n\n## LLM Feedback\n{llm_feedback}"

    return {
        "ATSScore": composite,
        "ATSReport": full_report,
        "ATSAttempts": next_attempts,
    }
