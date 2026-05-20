from ...utils.LLM import get_model
from .Prompt import ATS_AGENT_DESCRIPTION, ATS_AGENT_INSTRUCTIONS

# ATS feedback is a single-shot analysis. A deep agent's planning/task tools
# trip up Groq tool-calling, so ATSValidatorNode calls the model directly.
ATS_SYSTEM_PROMPT = f"{ATS_AGENT_DESCRIPTION}\n\n{ATS_AGENT_INSTRUCTIONS}"
ATSFeedbackModel = get_model()
