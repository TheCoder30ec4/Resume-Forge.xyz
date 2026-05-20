
import asyncio
import json
import re

from langchain_core.messages import HumanMessage, SystemMessage
from .Agent import LinkedinModel, LINKEDIN_SYSTEM_PROMPT
from ...Schemas.State import State
from ...tools.get_linkedin_data import get_linkedin
from ...utils.LLM import strip_think


def _extract_certifications(profile: list) -> str:
    """Build a structured certifications block directly from Apify data."""
    lines = []
    for item in profile:
        certs = item.get("certifications") or []
        username = item.get("publicIdentifier", "")
        certs_page_url = f"https://www.linkedin.com/in/{username}/details/certifications/" if username else ""

        for cert in certs:
            title = cert.get("title", "").strip()
            issued_by = cert.get("issuedBy", "").strip()
            issued_at = cert.get("issuedAt") or ""
            # Parse "Issued Oct 2025" → "2025-10"
            date_str = ""
            if issued_at:
                m = re.search(r"(\w+ \d{4})$", issued_at.strip())
                if m:
                    try:
                        from datetime import datetime
                        date_str = datetime.strptime(m.group(1), "%b %Y").strftime("%Y-%m")
                    except ValueError:
                        date_str = m.group(1)

            parts = [f"- {title}"]
            if issued_by:
                parts.append(f"  Issuer: {issued_by}")
            if date_str:
                parts.append(f"  Date: {date_str}")
            if certs_page_url:
                parts.append(f"  URL: {certs_page_url}")
            lines.append("\n".join(parts))

    return "\n\n".join(lines) if lines else "None"


async def _get_linkedin_cache(user_id: str) -> str | None:
    """Return cached LinkedIn summary string from Redis if available."""
    try:
        from Backend.api.database.redis import cache_get, key_linkedin
        return await cache_get(key_linkedin(user_id))
    except Exception:
        return None


async def _set_linkedin_cache(user_id: str, summary: str, ttl: int) -> None:
    try:
        from Backend.api.database.redis import cache_set, key_linkedin
        await cache_set(key_linkedin(user_id), summary, ttl=ttl)
    except Exception:
        pass


async def LinkedinNode(state: State) -> dict:
    user_id = state.get("user_id")

    # Check Redis cache — LinkedIn profile changes infrequently (24h TTL)
    if user_id:
        cached_summary = await _get_linkedin_cache(user_id)
        if cached_summary and isinstance(cached_summary, str) and len(cached_summary) > 100:
            return {"LinkedinSummary": cached_summary}

    # Fetch the connected LinkedIn profile deterministically (Apify is a blocking
    # HTTP call, so run it off the event loop). The agent only analyzes the data.
    profile = await asyncio.to_thread(get_linkedin, state["LinkedinURL"])

    certifications_block = _extract_certifications(profile)

    user_input = (
        f"## Job Description\n{state['JD']}"
        f"\n\n## LinkedIn Profile Data\n{json.dumps(profile, indent=2, default=str)}"
        f"\n\n## Certifications (pre-extracted — use these verbatim in the Certifications section)\n{certifications_block}"
        f"\n\n## User Input\n{state['user_input'] or ''}"
    )

    result = await LinkedinModel.ainvoke([
        SystemMessage(content=LINKEDIN_SYSTEM_PROMPT),
        HumanMessage(content=user_input),
    ])

    summary = strip_think(result.content)

    # Cache the summary for future sessions
    if user_id:
        try:
            from Backend.api.config.settings import get_settings
            ttl = get_settings().LINKEDIN_CACHE_TTL
            await _set_linkedin_cache(user_id, summary, ttl)
        except Exception:
            pass

    return {"LinkedinSummary": summary}
