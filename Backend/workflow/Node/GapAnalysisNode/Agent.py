from ...utils.LLM import get_model
from .GapAnalysisPrompt import GAP_ANALYSIS_DESCRIPTION, GAP_ANALYSIS_INSTRUCTIONS

# Gap analysis is a single-shot analysis (JD + evidence → playbook). A deep
# agent's planning/task tools trip up Groq tool-calling, so GapAnalysisNode
# calls the model directly with this system prompt.
GAP_SYSTEM_PROMPT = f"{GAP_ANALYSIS_DESCRIPTION}\n\n{GAP_ANALYSIS_INSTRUCTIONS}"
GapAnalysisModel = get_model()
