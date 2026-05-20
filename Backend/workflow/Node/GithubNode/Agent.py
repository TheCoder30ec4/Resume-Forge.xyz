from deepagents import create_deep_agent
from deepagents.backends.filesystem import FilesystemBackend

from ...utils.LLM import get_model
from .GithubPrompt import (
    SELECT_DESCRIPTION,
    SELECT_INSTRUCTIONS,
    SUMMARIZE_DESCRIPTION,
    SUMMARIZE_INSTRUCTIONS,
)

# Repo selection is single-shot (JD + repo list → JSON array). A deep agent's
# planning tools (write_todos) trip up Groq tool-calling, so call the model
# directly with this system prompt instead.
SELECT_SYSTEM_PROMPT = f"{SELECT_DESCRIPTION}\n\n{SELECT_INSTRUCTIONS}"
GithubSelectModel = get_model()


def make_summarize_agent(repo_clone_path: str):
    """Build a per-repo summarize agent with filesystem access scoped to the clone.

    virtual_mode=True is REQUIRED: without it, absolute paths like `/` bypass
    `root_dir` and the agent reads the real OS filesystem instead of the clone.
    With it, the agent's `/` maps to the repo clone — which is what the summarize
    prompt assumes ("ls /", "read_file /README.md").
    """
    return create_deep_agent(
        model=get_model(),
        backend=FilesystemBackend(root_dir=repo_clone_path, virtual_mode=True),
        system_prompt=f"{SUMMARIZE_DESCRIPTION}\n\n{SUMMARIZE_INSTRUCTIONS}",
    )
