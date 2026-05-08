from deepagents import create_deep_agent
from ...utils.LLM import get_model
from .JDPrompt import JD_DESCRIPTION, JD_INSTRUCTIONS

JDAgent = create_deep_agent(
    model=get_model(),
    system_prompt=f"{JD_DESCRIPTION}\n\n{JD_INSTRUCTIONS}",
)
