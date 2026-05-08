from langchain_core.messages import HumanMessage
from .Agent import JDAgent
from ...Schemas.State import State


async def JDNode(state: State) -> dict:
    user_input = f"<job_description>\n{state['JD']}\n</job_description>"

    result = await JDAgent.ainvoke(
        {"messages": [HumanMessage(content=user_input)]}
    )

    return {"JDAnalysis": result["messages"][-1].content}
