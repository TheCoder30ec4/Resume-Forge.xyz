from langchain_core.messages import HumanMessage
from .Agent import LinkedinAgent
from ...Schemas.State import State


async def LinkedinNode(state: State) -> State:
    user_input = (
        f"Job Description:\n{state['JD']}"
        f"\n\nUser Input: {state['user_input'] or ''}"
    )

    result = await LinkedinAgent.ainvoke(
        {"messages": [HumanMessage(content=user_input)]}
    )

    state["LinkedinSummary"] = result["messages"][-1].content
    return state
