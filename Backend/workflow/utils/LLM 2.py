from langchain_groq import ChatGroq
from dotenv import load_dotenv
import os

load_dotenv()


def get_model() -> ChatGroq:
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API"),
    )
