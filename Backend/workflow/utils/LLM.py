import re
from langchain_groq import ChatGroq
from dotenv import load_dotenv
import os

load_dotenv()


def get_model() -> ChatGroq:
    # temperature=0: every node is a grounded extraction/analysis task — JD
    # parsing, evidence summarizing, resume writing. Zero temperature keeps the
    # model deterministic and stops it from inventing impressive-sounding
    # metrics that aren't in the source evidence.
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API") or os.getenv("GROQ_API_KEY"),
        max_tokens=8192,
        temperature=0,
    )


def strip_think(text: str) -> str:
    """Remove Qwen3 <think>...</think> chain-of-thought blocks from LLM output."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
