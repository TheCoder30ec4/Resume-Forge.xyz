from deepagents import create_deep_agent
from ...utils.LLM import get_model
from .GapAnalysisPrompt import GAP_ANALYSIS_DESCRIPTION, GAP_ANALYSIS_INSTRUCTIONS

GapAnalysisAgent = create_deep_agent(
    model=get_model(),
    system_prompt=f"{GAP_ANALYSIS_DESCRIPTION}\n\n{GAP_ANALYSIS_INSTRUCTIONS}",
)
