from langchain_core.messages import HumanMessage
from .Agent import ResumeWriteAgent
from ...Schemas.State import State


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

    if state.get("ATSReport") and state.get("ATSAttempts", 0) > 0:
        sections.append(
            f"## Previous ATS Feedback (attempt {state['ATSAttempts']})\n{state['ATSReport']}"
        )

    if state.get("user_input"):
        sections.append(f"## User Input\n{state['user_input']}")

    result = await ResumeWriteAgent.ainvoke(
        {"messages": [HumanMessage(content="\n\n".join(sections))]}
    )

    return {"ResumeDraft": result["messages"][-1].content}
