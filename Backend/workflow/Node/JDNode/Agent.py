from ...utils.LLM import get_model
from .JDPrompt import JD_DESCRIPTION, JD_INSTRUCTIONS

# JD analysis is a single-shot extraction: JD text → JSON. A deep agent (with
# its planning loop / tool calls) returns agentic messages that aren't clean
# JSON. So JDNode calls the model directly with this system prompt instead.
JD_SYSTEM_PROMPT = f"{JD_DESCRIPTION}\n\n{JD_INSTRUCTIONS}"
JDModel = get_model()
