import json
import re
from ...Schemas.State import State


def _extract_keywords(jd_analysis: str) -> list[str]:
    """Pull JD keywords from the JD_Analysis JSON.

    Falls back gracefully if the JSON is malformed by returning an empty list.
    """
    try:
        data = json.loads(jd_analysis)
    except (json.JSONDecodeError, TypeError):
        return []

    keywords: list[str] = []
    skills = data.get("skills", {})
    keywords.extend(skills.get("hard_skills_required", []))
    keywords.extend(skills.get("hard_skills_preferred", []))
    keywords.extend(skills.get("frameworks_and_libraries", []))
    keywords.extend(skills.get("tools_and_platforms", []))

    role_identity = data.get("role_identity", {})
    keywords.extend(role_identity.get("industry_keywords", []))

    ats = data.get("ats_extractions", {})
    keywords.extend(ats.get("exact_phrases", []))
    keywords.extend(ats.get("emphasized_terms", []))

    seen: set[str] = set()
    deduped: list[str] = []
    for kw in keywords:
        if not kw:
            continue
        norm = kw.strip().lower()
        if norm and norm not in seen:
            seen.add(norm)
            deduped.append(kw.strip())
    return deduped


def _keyword_in_text(keyword: str, text_lower: str) -> bool:
    pattern = r"\b" + re.escape(keyword.lower()) + r"\b"
    return bool(re.search(pattern, text_lower))


async def ATSValidatorNode(state: State) -> dict:
    keywords = _extract_keywords(state["JDAnalysis"])
    resume_lower = state["ResumeDraft"].lower()
    next_attempts = state.get("ATSAttempts", 0) + 1

    if not keywords:
        return {
            "ATSScore": 0.0,
            "ATSReport": "No keywords extracted from JD analysis — cannot validate.",
            "ATSAttempts": next_attempts,
        }

    matched: list[str] = []
    missing: list[str] = []
    for kw in keywords:
        if _keyword_in_text(kw, resume_lower):
            matched.append(kw)
        else:
            missing.append(kw)

    score = len(matched) / len(keywords)

    return {
        "ATSScore": round(score, 3),
        "ATSReport": (
            f"Coverage: {len(matched)}/{len(keywords)} keywords ({score:.1%})\n"
            f"Matched: {', '.join(matched) if matched else '(none)'}\n"
            f"Missing: {', '.join(missing) if missing else '(none)'}"
        ),
        "ATSAttempts": next_attempts,
    }
