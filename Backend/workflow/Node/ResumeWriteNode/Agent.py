from pathlib import Path
from deepagents import create_deep_agent
from deepagents.backends.filesystem import FilesystemBackend
from ...utils.LLM import get_model
from .ResumeWritePrompt import RESUME_WRITE_DESCRIPTION, RESUME_WRITE_INSTRUCTIONS

# Agent.py lives at Backend/workflow/Node/ResumeWriteNode/Agent.py
WORKFLOW_ROOT = Path(__file__).resolve().parents[2]   # Backend/workflow
PROJECT_ROOT = Path(__file__).resolve().parents[4]    # repo root
SKILLS_DIR = str(WORKFLOW_ROOT / "skills")

ResumeWriteAgent = create_deep_agent(
    model=get_model(),
    backend=FilesystemBackend(root_dir=PROJECT_ROOT, virtual_mode=True),
    skills=[SKILLS_DIR],
    system_prompt=f"{RESUME_WRITE_DESCRIPTION}\n\n{RESUME_WRITE_INSTRUCTIONS}",
)
