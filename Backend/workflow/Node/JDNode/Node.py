import asyncio
import json

from langchain_core.messages import HumanMessage, SystemMessage
from .Agent import JDModel, JD_SYSTEM_PROMPT
from .Schema import JDAnalysis
from ...Schemas.State import State
from ...utils.LLM import strip_think

# A flaky model call shouldn't fail the whole workflow — retry a few times.
_MAX_ATTEMPTS = 4


def _strip_fence(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        lines = t.split("\n")
        lines = lines[1:] if lines[0].startswith("```") else lines
        lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
        t = "\n".join(lines).strip()
    return t


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
    """Extract the JSON object — tolerates <think> blocks and markdown fences."""
    for candidate in (_strip_fence(strip_think(text)), _strip_fence(text), text):
        found = _largest_balanced_json(candidate)
        if found:
            return found
    raise ValueError("No JSON object found in JD analysis response")


async def JDNode(state: State) -> dict:
    content = f"<job_description>\n{state['JD']}\n</job_description>"
    if state.get("user_input"):
        content += f"\n\n<user_preferences>\n{state['user_input']}\n</user_preferences>"

    messages = [
        SystemMessage(content=JD_SYSTEM_PROMPT),
        HumanMessage(content=content),
    ]

    last_error: Exception | None = None
    for attempt in range(1, _MAX_ATTEMPTS + 1):
        try:
            result = await JDModel.ainvoke(messages)
            raw = _extract_json(result.content)
            # JDAnalysis validators normalize role_level / employment_type / etc.
            analysis = JDAnalysis.model_validate_json(raw)
            return {"JDAnalysis": analysis.model_dump_json()}
        except Exception as exc:  # noqa: BLE001 — retry any parse/model failure
            last_error = exc
            if attempt < _MAX_ATTEMPTS:
                await asyncio.sleep(2 * attempt)

    raise RuntimeError(
        f"JD analysis failed after {_MAX_ATTEMPTS} attempts: {last_error}"
    )
