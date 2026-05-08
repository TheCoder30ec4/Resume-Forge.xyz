import asyncio
import json
from typing import TypedDict, List, Optional

from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, END

from .Agent import GithubSelectAgent, make_summarize_agent
from ...Schemas.State import State
from ...tools.get_github_repos import get_github_repos
from ...tools.clone_repo import clone_repo, cleanup_repo


class GithubSubState(TypedDict):
    JDAnalysis: str
    AllRepos: List[dict]
    SelectedNames: List[str]
    Summaries: List[dict]
    user_input: Optional[str]


async def _fetch_node(state: GithubSubState) -> GithubSubState:
    state["AllRepos"] = await asyncio.to_thread(get_github_repos)
    return state


async def _select_node(state: GithubSubState) -> GithubSubState:
    if not state["AllRepos"]:
        state["SelectedNames"] = []
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
        for r in state["AllRepos"]
    ]

    user_input = (
        f"## JD Analysis\n{state['JDAnalysis']}"
        f"\n\n## Repos\n{json.dumps(repos_compact, indent=2)}"
    )
    if state.get("user_input"):
        user_input += f"\n\n## User Input\n{state['user_input']}"

    result = await GithubSelectAgent.ainvoke(
        {"messages": [HumanMessage(content=user_input)]}
    )
    raw = result["messages"][-1].content
    try:
        state["SelectedNames"] = json.loads(raw)
    except json.JSONDecodeError:
        state["SelectedNames"] = [r["name"] for r in state["AllRepos"][:3]]
    return state


async def _summarize_one(repo: dict, jd_analysis: str) -> dict:
    """Clone the repo, run the summarize agent with filesystem access, clean up."""
    clone_path = None
    try:
        clone_path = await clone_repo(repo["url"])
        agent = make_summarize_agent(clone_path)

        repo_meta = {
            "name": repo["name"],
            "url": repo["url"],
            "languages": repo["languages"],
            "topics": repo["topics"],
            "stars": repo["stars"],
        }
        user_input = (
            f"## JD Analysis\n{jd_analysis}"
            f"\n\n## Repo metadata\n{json.dumps(repo_meta, indent=2)}"
            f"\n\nThe repo is checked out at the filesystem root. Walk it now."
        )

        result = await agent.ainvoke(
            {"messages": [HumanMessage(content=user_input)]}
        )
        raw = result["messages"][-1].content
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {
                "name": repo["name"],
                "url": repo.get("url", ""),
                "languages": repo.get("languages", []),
                "problem_statement": "",
                "solution": raw[:500],
                "impact": "",
                "jd_alignment": "",
            }
    except Exception as e:
        return {
            "name": repo["name"],
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
        *[_summarize_one(r, state["JDAnalysis"]) for r in selected]
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
    sub_state: GithubSubState = {
        "JDAnalysis": state["JDAnalysis"],
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
