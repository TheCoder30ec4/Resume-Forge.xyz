from deepagents import create_deep_agent
from ...utils.LLM import get_model
from ...tools.get_linkedin_data import get_linkedin
from .LinkedinPrompt import LINKEDIN_DESCRIPTION, LINKEDIN_INSTRUCTIONS

LinkedinAgent = create_deep_agent(
    model=get_model(),
    tools=[get_linkedin],
    system_prompt=f"{LINKEDIN_DESCRIPTION}\n\n{LINKEDIN_INSTRUCTIONS}",
)
