from deepagents import create_deep_agent
from deepagents.backends.filesystem import FilesystemBackend

from ...utils.LLM import get_model
from .GithubPrompt import (
    SELECT_DESCRIPTION,
    SELECT_INSTRUCTIONS,
    SUMMARIZE_DESCRIPTION,
    SUMMARIZE_INSTRUCTIONS,
)

GithubSelectAgent = create_deep_agent(
    model=get_model(),
    system_prompt=f"{SELECT_DESCRIPTION}\n\n{SELECT_INSTRUCTIONS}",
)


def make_summarize_agent(repo_clone_path: str):
    """Build a per-repo summarize agent with filesystem access scoped to the clone."""
    return create_deep_agent(
        model=get_model(),
        backend=FilesystemBackend(root_dir=repo_clone_path),
        system_prompt=f"{SUMMARIZE_DESCRIPTION}\n\n{SUMMARIZE_INSTRUCTIONS}",
    )
