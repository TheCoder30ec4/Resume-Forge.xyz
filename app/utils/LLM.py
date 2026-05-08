from langchain_groq import ChatGroq
from dotenv import load_dotenv
import os

load_dotenv()


def get_model() -> ChatGroq:
    return ChatGroq(
        model="qwen/qwen3-32b",
        api_key=os.getenv("GROQ_API") or os.getenv("GROQ_API_KEY"),
    )
