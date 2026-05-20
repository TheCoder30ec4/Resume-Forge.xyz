from ...utils.LLM import get_model
from .LinkedinPrompt import LINKEDIN_DESCRIPTION, LINKEDIN_INSTRUCTIONS

# LinkedinNode fetches the connected profile deterministically and passes it
# into the prompt — the model only analyzes and matches against the JD. It's a
# single-shot call; a deep agent's tools trip up Groq tool-calling, so
# LinkedinNode calls the model directly with this system prompt.
LINKEDIN_SYSTEM_PROMPT = f"{LINKEDIN_DESCRIPTION}\n\n{LINKEDIN_INSTRUCTIONS}"
LinkedinModel = get_model()
