from langchain_core.messages import HumanMessage, SystemMessage
from .Agent import GapAnalysisModel, GAP_SYSTEM_PROMPT
from ...Schemas.State import State
from ...utils.LLM import strip_think


async def GapAnalysisNode(state: State) -> dict:
    github_summaries = "\n\n".join(
        p["projectSummary"] for p in state.get("GithubProjectSummary", [])
    )

    content = (
        f"## JD Analysis\n{state['JDAnalysis']}"
        f"\n\n## LinkedIn Summary\n{state['LinkedinSummary']}"
        f"\n\n## GitHub Projects\n{github_summaries}"
    )
    if state.get("user_input"):
        content += f"\n\n## User Preferences\n{state['user_input']}"

    result = await GapAnalysisModel.ainvoke([
        SystemMessage(content=GAP_SYSTEM_PROMPT),
        HumanMessage(content=content),
    ])

    return {"GapAnalysis": strip_think(result.content)}
