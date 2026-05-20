from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types
import json




async def __ensure_session(session_id:str, session_service: InMemorySessionService, APP_NAME:str, USER_ID:str):
    existing_session = await session_service.list_sessions(app_name=APP_NAME, user_id=USER_ID)
    existing_session_ids = [s.id for s in (existing_session.sessions or [])]
    if session_id not in existing_session_ids:
        await session_service.create_session(
            app_name=APP_NAME,
            user_id=USER_ID, 
            session_id=session_id
        )
        print(f"Created new session with id: {session_id}")
    else:
        print(f"Session with id: {session_id} already exists.Using existing session.")
        
async def list_sessions(session_service: InMemorySessionService, APP_NAME:str, USER_ID:str):
    existing_session= await session_service.list_sessions(app_name=APP_NAME, user_id=USER_ID)
    return [s.id for s in (existing_session or [])]

async def agent_runner(agent: LlmAgent, user_input:str, session_id:str, session_service: InMemorySessionService, APP_NAME:str, USER_ID:str):
    await __ensure_session(session_id, session_service, APP_NAME, USER_ID)
    
    runner = Runner(agent=agent,
                    app_name=APP_NAME,
                    session_service=session_service,)
    
    message = types.Content(
        role="user",
        parts=[types.Part(text=user_input)]
    )
    
    final_response = ""
    
    async for event in runner.run_async(
        user_id=USER_ID,
        session_id=session_id,
        new_message=message,
    ):
        if event.is_final_response() and event.content:
            for part in event.content.parts:
                if hasattr(part,"thought") and part.thought:
                    print(f"Thought: {part.thought}")
                elif part.text and part.text.strip():
                    final_response += part.text
                    
    structured = None
    if agent.output_key:
        session = await session_service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=session_id)
        raw = session.state.get(agent.output_key)
        
        if raw:
            structured = raw if isinstance(raw,dict) else json.loads(raw)
    return final_response.strip(),structured
    