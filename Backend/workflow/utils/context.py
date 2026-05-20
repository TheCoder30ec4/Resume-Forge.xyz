import os
from dotenv import load_dotenv
from google.adk.sessions import DatabaseSessionService

from Backend.workflow.utils.async_agent_runner import AgentContext
from .async_agent_runner import AgentContext

load_dotenv()


APP_NAME = "ResumeBuilder"
USER_ID  = "Local_User"

_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

session_service = DatabaseSessionService(db_url=_DATABASE_URL)

ctx = AgentContext(
    session_service=session_service,
    app_name=APP_NAME,
    user_id=USER_ID,
)
