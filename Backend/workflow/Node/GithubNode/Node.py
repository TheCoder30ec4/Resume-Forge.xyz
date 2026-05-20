import asyncio
import json
from typing import TypedDict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END

from .Agent import GithubSelectModel, SELECT_SYSTEM_PROMPT, make_summarize_agent
from ...Schemas.State import State
from ...tools.get_github_repos import get_github_repos
from ...tools.clone_repo import clone_repo, cleanup_repo
from ...utils.LLM import strip_think

MIN_REPOS = 2
MAX_REPOS = 10


def _extract_json(text: str) -> dict | None:
    """Best-effort parse of a JSON object from an LLM response."""
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    return None


async def _get_repo_cache(user_id: str, repo: str) -> dict | None:
    """Return cached repo summary from Redis if available."""
    try:
        from Backend.api.database.redis import cache_get, key_github_repo_summary
        return await cache_get(key_github_repo_summary(user_id, repo))
    except Exception:
        return None


async def _set_repo_cache(user_id: str, repo: str, summary: dict, ttl: int) -> None:
    try:
        from Backend.api.database.redis import cache_set, key_github_repo_summary
        await cache_set(key_github_repo_summary(user_id, repo), summary, ttl=ttl)
    except Exception:
        pass


class GithubSubState(TypedDict):
    JDAnalysis: str
    GrantedRepos: List[str]      # "owner/repo" names the user connected (2-10)
    GithubToken: Optional[str]
    UserId: Optional[str]
    AllRepos: List[dict]
    SelectedNames: List[str]
    Summaries: List[dict]
    user_input: Optional[str]


async def _fetch_node(state: GithubSubState) -> GithubSubState:
    state["AllRepos"] = await asyncio.to_thread(
        get_github_repos, state["GrantedRepos"], state["GithubToken"]
    )
    return state


async def _select_node(state: GithubSubState) -> GithubSubState:
    """Pick which fetched repos to summarize.

    The user already curated the granted set on the frontend, so when they
    granted 2 repos we summarize both directly. With more than 2, an LLM step
    picks the ones most relevant to the JD.
    """
    repos = state["AllRepos"]
    if not repos:
        state["SelectedNames"] = []
        return state

    if len(repos) <= MIN_REPOS:
        state["SelectedNames"] = [r["name"] for r in repos]
        return state

    repos_compact = [
        {
            "name": r["name"],
            "description": r["description"],
            "languages": r["languages"],
            "topics": r["topics"],
            "stars": r["stars"],
            "readme_excerpt": r["readme_excerpt"][:600],
        }
        for r in repos
    ]

    user_input = (
        f"## JD Analysis\n{state['JDAnalysis']}"
        f"\n\n## Repos\n{json.dumps(repos_compact, indent=2)}"
    )
    if state.get("user_input"):
        user_input += f"\n\n## User Input\n{state['user_input']}"

    try:
        result = await GithubSelectModel.ainvoke([
            SystemMessage(content=SELECT_SYSTEM_PROMPT),
            HumanMessage(content=user_input),
        ])
        raw = strip_think(result.content).strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            lines = lines[1:] if lines[0].startswith("```") else lines
            lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
            raw = "\n".join(lines).strip()
        # Extract the JSON array even if wrapped in prose.
        s, e = raw.find("["), raw.rfind("]")
        names = json.loads(raw[s:e + 1] if s != -1 and e != -1 else raw)
        state["SelectedNames"] = [n for n in names if isinstance(n, str)]
        if not state["SelectedNames"]:
            raise ValueError("empty selection")
    except Exception:  # noqa: BLE001 — fall back to the first 4 repos
        state["SelectedNames"] = [r["name"] for r in repos[:4]]
    return state


async def _summarize_one(repo: dict, jd_analysis: str, user_id: str | None) -> dict:
    """Return cached summary if available; otherwise clone + run agent + cache result."""
    repo_name = repo["name"]

    # Check Redis cache first
    if user_id:
        cached = await _get_repo_cache(user_id, repo_name)
        if cached:
            # Cached summary may be stored as {"repo": ..., "summary": <str>} from
            # the background worker, or as a full structured dict from the agent.
            if isinstance(cached, dict) and "projectSummary" not in cached and "summary" in cached:
                # Background-worker format — re-parse the nested summary string
                nested = _extract_json(cached["summary"])
                if nested:
                    return nested
            elif isinstance(cached, dict) and "name" in cached:
                return cached

    clone_path = None
    try:
        clone_path = await clone_repo(repo["url"])
        agent = make_summarize_agent(clone_path)

        repo_meta = {
            "name": repo_name,
            "url": repo["url"],
            "languages": repo["languages"],
            "topics": repo["topics"],
            "stars": repo["stars"],
        }
        prompt = (
            f"## JD Analysis\n{jd_analysis}"
            f"\n\n## Repo metadata\n{json.dumps(repo_meta, indent=2)}"
            f"\n\nThe repo is checked out at the filesystem root. Walk it now."
        )

        result = await agent.ainvoke(
            {"messages": [HumanMessage(content=prompt)]}
        )
        raw = strip_think(result["messages"][-1].content)
        parsed = _extract_json(raw)
        summary = parsed if parsed is not None else {
            "name": repo_name,
            "url": repo.get("url", ""),
            "languages": repo.get("languages", []),
            "problem_statement": "",
            "solution": raw[:500],
            "impact": "",
            "jd_alignment": "",
        }

        # Persist to Redis for future sessions
        if user_id:
            from Backend.api.config.settings import get_settings
            ttl = get_settings().GITHUB_REPO_CACHE_TTL
            await _set_repo_cache(user_id, repo_name, summary, ttl)

        return summary

    except Exception as e:
        return {
            "name": repo_name,
            "url": repo.get("url", ""),
            "languages": repo.get("languages", []),
            "problem_statement": "",
            "solution": f"(failed to walk repo: {e})",
            "impact": "",
            "jd_alignment": "",
        }
    finally:
        if clone_path:
            cleanup_repo(clone_path)


async def _summarize_node(state: GithubSubState) -> GithubSubState:
    selected = [r for r in state["AllRepos"] if r["name"] in state["SelectedNames"]]
    if not selected:
        state["Summaries"] = []
        return state

    state["Summaries"] = await asyncio.gather(
        *[_summarize_one(r, state["JDAnalysis"], state.get("UserId")) for r in selected]
    )
    return state


def _build_subgraph():
    g = StateGraph(GithubSubState)
    g.add_node("fetch", _fetch_node)
    g.add_node("select", _select_node)
    g.add_node("summarize", _summarize_node)
    g.set_entry_point("fetch")
    g.add_edge("fetch", "select")
    g.add_edge("select", "summarize")
    g.add_edge("summarize", END)
    return g.compile()


_subgraph = _build_subgraph()


async def GithubNode(state: State) -> dict:
    granted = state.get("GithubRepos") or []
    if not (MIN_REPOS <= len(granted) <= MAX_REPOS):
        raise ValueError(
            f"The user must connect between {MIN_REPOS} and {MAX_REPOS} GitHub repos; "
            f"got {len(granted)}."
        )

    sub_state: GithubSubState = {
        "JDAnalysis": state["JDAnalysis"],
        "GrantedRepos": granted,
        "GithubToken": state.get("GithubToken"),
        "UserId": state.get("user_id"),
        "AllRepos": [],
        "SelectedNames": [],
        "Summaries": [],
        "user_input": state.get("user_input"),
    }
    result = await _subgraph.ainvoke(sub_state)

    return {
        "GithubProjectSummary": [
            {"projectSummary": json.dumps(s)} for s in result["Summaries"]
        ]
    }
