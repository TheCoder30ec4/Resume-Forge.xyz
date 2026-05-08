import json
from langchain_core.messages import HumanMessage
from .Agent import GapAnalysisAgent
from ...Schemas.State import State


async def GapAnalysisNode(state: State) -> dict:
    github_summaries = "\n\n".join(
        p["projectSummary"] for p in state.get("GithubProjectSummary", [])
    )

    user_input = (
        f"## JD Analysis\n{state['JDAnalysis']}"
        f"\n\n## LinkedIn Summary\n{state['LinkedinSummary']}"
        f"\n\n## GitHub Projects\n{github_summaries}"
    )

    result = await GapAnalysisAgent.ainvoke(
        {"messages": [HumanMessage(content=user_input)]}
    )

    return {"GapAnalysis": result["messages"][-1].content}
