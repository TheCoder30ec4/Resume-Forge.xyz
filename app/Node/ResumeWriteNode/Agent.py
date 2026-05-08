from pathlib import Path
from deepagents import create_deep_agent
from ...utils.LLM import get_model
from .ResumeWritePrompt import RESUME_WRITE_DESCRIPTION, RESUME_WRITE_INSTRUCTIONS

SKILLS_DIR = str((Path(__file__).resolve().parents[3] / "app" / "skills"))

ResumeWriteAgent = create_deep_agent(
    model=get_model(),
    skills=[SKILLS_DIR],
    system_prompt=f"{RESUME_WRITE_DESCRIPTION}\n\n{RESUME_WRITE_INSTRUCTIONS}",
)
