import json
import re
from langchain_core.messages import HumanMessage
from .Agent import ResumeWriteAgent
from .Schema import ResumeContent, CertificationEntry
from ...Schemas.State import State


_PLACEHOLDER_STRINGS = {
    "not specified", "n/a", "none", "unknown", "city, st",
    "email@example.com", "your email", "your phone",
}


def _null_placeholders(obj):
    """Recursively replace placeholder strings with None so exclude_none drops them."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str) and v.strip().lower() in _PLACEHOLDER_STRINGS:
                obj[k] = None
            else:
                _null_placeholders(v)
    elif isinstance(obj, list):
        for item in obj:
            _null_placeholders(item)


def _strip_fence(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        lines = t.split("\n")
        lines = lines[1:] if lines[0].startswith("```") else lines
        lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
        t = "\n".join(lines).strip()
    return t


def _strip_think(text: str) -> str:
    """Remove Qwen3-style <think>...</think> chain-of-thought blocks."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def _largest_balanced_json(text: str) -> str | None:
    """Return the largest balanced {...} substring that parses as JSON, or None."""
    best: str | None = None
    for start in range(len(text)):
        if text[start] != "{":
            continue
        depth = 0
        in_str = False
        escape = False
        for i in range(start, len(text)):
            ch = text[i]
            if escape:
                escape = False
                continue
            if ch == "\\" and in_str:
                escape = True
                continue
            if ch == '"':
                in_str = not in_str
            elif not in_str:
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        cand = text[start:i + 1]
                        try:
                            json.loads(cand)
                            if best is None or len(cand) > len(best):
                                best = cand
                        except json.JSONDecodeError:
                            pass
                        break
    return best


def _extract_json(text: str) -> str:
    """Extract the JSON object from an LLM response.

    Tries the response with <think> blocks + fences stripped first; falls back
    to the raw text (the model sometimes leaves the JSON inside a think block).
    """
    for candidate in (_strip_fence(_strip_think(text)), _strip_fence(text), text):
        found = _largest_balanced_json(candidate)
        if found:
            return found
    raise ValueError("No JSON object found in LLM response")


def _jd_keywords(jd_analysis: str) -> set[str]:
    """Extract a flat set of lowercased keywords from the JD analysis JSON."""
    keywords: set[str] = set()
    try:
        data = json.loads(jd_analysis)
    except (json.JSONDecodeError, TypeError):
        return keywords

    skills = data.get("skills", {})
    for field in ("hard_skills_required", "soft_skills", "frameworks_and_libraries",
                  "tools_and_platforms", "hard_skills_nice_to_have"):
        for item in skills.get(field) or []:
            keywords.update(w.lower() for w in re.split(r"\W+", item) if len(w) > 2)

    role = data.get("role_identity", {})
    for field in ("domain", "role_level"):
        val = role.get(field) or ""
        keywords.update(w.lower() for w in re.split(r"\W+", val) if len(w) > 2)

    for kw in (data.get("keyword_frequency") or {}).keys():
        keywords.update(w.lower() for w in re.split(r"\W+", kw) if len(w) > 2)

    return keywords


# Issuers that indicate broad professional credibility — always include.
_ALWAYS_INCLUDE_ISSUERS = {
    "google", "aws", "amazon", "microsoft", "meta", "apple", "ibm",
    "oracle", "cisco", "red hat", "linux foundation", "cncf",
    "openedg python institute", "deeplearning.ai", "coursera", "edx",
    "aspiring minds", "amcat",
}


def _cert_is_relevant(cert: CertificationEntry, keywords: set[str]) -> bool:
    """Return True if the cert name or issuer overlaps with JD keywords."""
    text = f"{cert.name} {cert.issuer or ''}".lower()
    tokens = set(w for w in re.split(r"\W+", text) if len(w) > 2)

    # Always keep certs from major/recognised issuers
    issuer_lower = (cert.issuer or "").lower()
    if any(a in issuer_lower for a in _ALWAYS_INCLUDE_ISSUERS):
        return True

    # Keep if any JD keyword appears in the cert text
    return bool(tokens & keywords)


def _parse_certs_from_summary(linkedin_summary: str) -> list[CertificationEntry] | None:
    """Extract the certifications block written by LinkedinNode deterministically."""
    m = re.search(r"## Certifications\n(.*?)(?=\n## |\Z)", linkedin_summary, re.DOTALL)
    if not m:
        return None
    block = m.group(1).strip()
    if block.lower() == "none":
        return None

    certs = []
    # Each cert starts with "- <title>"
    entries = re.split(r"\n(?=- )", block)
    for entry in entries:
        lines = entry.strip().splitlines()
        if not lines:
            continue
        title = lines[0].lstrip("- ").strip()
        issuer = date = url = None
        for line in lines[1:]:
            line = line.strip()
            if line.startswith("Issuer:"):
                issuer = line[len("Issuer:"):].strip()
            elif line.startswith("Date:"):
                date = line[len("Date:"):].strip()
            elif line.startswith("URL:"):
                url = line[len("URL:"):].strip()
        if title:
            certs.append(CertificationEntry(name=title, issuer=issuer, date=date, url=url))
    return certs or None


def _normalize_social_networks(cv_data: dict) -> None:
    """Fix the common LLM mistake of using name/url instead of network/username."""
    for sn in cv_data.get("social_networks") or []:
        if not isinstance(sn, dict):
            continue
        if "network" not in sn and "name" in sn:
            sn["network"] = sn.pop("name")
        if "username" not in sn and "url" in sn:
            # e.g. "github.com/TheCoder30ec4" → "TheCoder30ec4"
            sn["username"] = str(sn.pop("url")).rstrip("/").split("/")[-1]


async def ResumeWriteNode(state: State) -> dict:
    github_summaries = "\n\n".join(
        p["projectSummary"] for p in state.get("GithubProjectSummary", [])
    )

    sections = [
        f"## JD Analysis\n{state['JDAnalysis']}",
        f"## LinkedIn Summary\n{state['LinkedinSummary']}",
        f"## GitHub Projects\n{github_summaries}",
        f"## Gap Analysis\n{state['GapAnalysis']}",
    ]

    if state.get("IsFresher"):
        sections.append(
            "## Candidate Status: FRESHER (no work experience)\n"
            "This candidate has NO work experience. Do NOT include an `experience` "
            "section — omit it entirely, even if the LinkedIn Summary lists jobs. "
            "Instead include exactly 4 projects: choose the 4 strongest, most "
            "JD-relevant GitHub projects and write full project entries for each."
        )

    if state.get("ATSReport") and state.get("ATSAttempts", 0) > 0:
        sections.append(
            f"## Previous ATS Feedback (attempt {state['ATSAttempts']})\n{state['ATSReport']}"
        )

    if state.get("user_input"):
        sections.append(f"## User Input\n{state['user_input']}")

    result = await ResumeWriteAgent.ainvoke(
        {"messages": [HumanMessage(content="\n\n".join(sections))]}
    )

    # The deep agent's final message isn't always the JSON (it may end on a
    # tool result or planning note) — scan messages newest-first for the cv JSON.
    raw = None
    for msg in reversed(result.get("messages", [])):
        content = getattr(msg, "content", "") or ""
        if isinstance(content, str) and "{" in content:
            try:
                raw = _extract_json(content)
                break
            except ValueError:
                continue
    if raw is None:
        raise ValueError("No JSON object found in resume writer response")
    parsed = json.loads(raw)

    # Unwrap top-level {"cv": {...}} if present, validate inner content
    cv_data = parsed.get("cv", parsed)
    _null_placeholders(cv_data)
    _normalize_social_networks(cv_data)
    resume = ResumeContent.model_validate(cv_data)

    # Parse all certs deterministically, filter to JD-relevant, cap at 4.
    certs = _parse_certs_from_summary(state.get("LinkedinSummary", ""))
    if certs is not None:
        keywords = _jd_keywords(state.get("JDAnalysis", ""))
        relevant = [c for c in certs if _cert_is_relevant(c, keywords)]
        resume.sections.certifications = relevant[:4] or None

    # ── Format rules (deterministic post-processing) ─────────────────────────
    # Identity comes from the profile-setup details the user entered — never
    # generated. Email, name, and location are forced from the user's profile.
    if state.get("UserEmail"):
        resume.email = state["UserEmail"]
    if state.get("UserName"):
        resume.name = state["UserName"]
    if state.get("UserLocation"):
        resume.location = state["UserLocation"]

    # A fresher has no work experience — never pull it from LinkedIn.
    if state.get("IsFresher"):
        resume.sections.experience = []

    # Strip literal XYZ-formula markers the LLM sometimes leaves in — e.g.
    # "Designed architecture (X) achieving 500+ assets (Y)" → markers removed.
    def _clean(text: str) -> str:
        return re.sub(r"\s*\(([XYZ])\)", "", text).strip()

    # At most 3 highlight bullets per experience / project entry.
    for entry in resume.sections.experience:
        entry.highlights = [_clean(h) for h in entry.highlights[:3]]
    for entry in resume.sections.projects or []:
        entry.highlights = [_clean(h) for h in entry.highlights[:3]]
        if entry.summary:
            entry.summary = _clean(entry.summary)

    # 2 projects when experience exists, otherwise 4.
    if resume.sections.projects:
        limit = 2 if resume.sections.experience else 4
        resume.sections.projects = resume.sections.projects[:limit]

    # Reverse-chronological order — newest first. "present" outranks any date.
    def _date_key(value) -> str:
        s = str(value or "").strip().lower()
        return "9999-99" if "present" in s else s

    resume.sections.experience.sort(key=lambda e: _date_key(e.end_date), reverse=True)
    resume.sections.education.sort(key=lambda ed: _date_key(ed.end_date), reverse=True)
    if resume.sections.projects:
        resume.sections.projects.sort(key=lambda p: _date_key(p.date), reverse=True)
    if resume.sections.certifications:
        resume.sections.certifications.sort(key=lambda c: _date_key(c.date), reverse=True)

    cv_json = json.dumps(
        {"cv": resume.model_dump(exclude_none=True)},
        ensure_ascii=False,
        indent=2,
    )
    return {"ResumeDraft": cv_json}
