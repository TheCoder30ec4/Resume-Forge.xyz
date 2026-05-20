"""FastAPI server — the frontend calls these endpoints.

Endpoints
---------
POST /resume/start          Start a new resume build session
POST /resume/{session_id}/revise   Revise with user feedback (rerun write → ats → render)
GET  /resume/{session_id}/status   Poll for current state / result
GET  /resume/{session_id}/pdf      Download the rendered PDF
"""
import asyncio
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .workflow import workflow_with_memory

app = FastAPI(title="ResumeBuilder API", version="1.0.0")

# In-memory session registry: session_id → {"status", "error", "result"}
# In production replace with Redis or a DB-backed store.
_sessions: dict[str, dict] = {}


# ── Request / Response models ─────────────────────────────────────────────────

class StartRequest(BaseModel):
    jd: str                          # Full job description text
    linkedin_url: str                # LinkedIn profile URL
    github_repos: list[str]          # ["owner/repo", ...] — 2 to 10
    github_token: Optional[str] = None
    theme: str = "classic"
    user_input: Optional[str] = None  # Optional initial preferences


class ReviseRequest(BaseModel):
    user_input: str                  # What the user wants changed


class SessionStatus(BaseModel):
    session_id: str
    status: str                      # "running" | "done" | "error"
    ats_score: Optional[float] = None
    ats_attempts: Optional[int] = None
    pdf_path: Optional[str] = None
    yaml_path: Optional[str] = None
    final_summary: Optional[str] = None
    error: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _initial_state(req: StartRequest, session_id: str) -> dict:
    return {
        "JD": req.jd,
        "user_input": req.user_input,
        "session_id": session_id,
        "LinkedinURL": req.linkedin_url,
        "GithubRepos": req.github_repos,
        "GithubToken": req.github_token,
        "JDAnalysis": "",
        "LinkedinSummary": "",
        "GithubProjectSummary": [],
        "GapAnalysis": "",
        "ResumeDraft": "",
        "ResumeYAMLPath": "",
        "ATSScore": 0.0,
        "ATSReport": "",
        "ATSAttempts": 0,
        "Theme": req.theme,
        "RenderedPDFPath": "",
        "ParseBackOK": False,
        "FinalSummary": "",
    }


async def _run_workflow(session_id: str, state: dict):
    """Run the workflow in the background and update session registry when done."""
    config = {"configurable": {"thread_id": session_id}}
    try:
        final = await workflow_with_memory.ainvoke(state, config=config)
        _sessions[session_id].update({
            "status": "done",
            "result": final,
        })
    except Exception as exc:
        _sessions[session_id].update({
            "status": "error",
            "error": str(exc),
        })


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/resume/start", response_model=SessionStatus)
async def start_resume(req: StartRequest, background_tasks: BackgroundTasks):
    """Start a new resume build. Returns session_id immediately; poll /status for progress."""
    if not (2 <= len(req.github_repos) <= 10):
        raise HTTPException(status_code=422, detail="Provide between 2 and 10 GitHub repos.")

    session_id = str(uuid.uuid4())[:8]
    state = _initial_state(req, session_id)
    _sessions[session_id] = {"status": "running", "result": None, "error": None}

    background_tasks.add_task(_run_workflow, session_id, state)

    return SessionStatus(session_id=session_id, status="running")


@app.post("/resume/{session_id}/revise", response_model=SessionStatus)
async def revise_resume(session_id: str, req: ReviseRequest, background_tasks: BackgroundTasks):
    """Revise an existing resume with user feedback. Re-enters at write node."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found.")
    if _sessions[session_id]["status"] == "running":
        raise HTTPException(status_code=409, detail="Session is still running.")

    # Merge updated user_input into the checkpoint and reset ATS counter
    # so the full write → ats loop runs again with the new preferences.
    revise_state = {
        "user_input": req.user_input,
        "ATSAttempts": 0,
        "ATSReport": "",
        "ATSScore": 0.0,
        "ResumeDraft": "",
        "ResumeYAMLPath": "",
        "RenderedPDFPath": "",
        "ParseBackOK": False,
        "FinalSummary": "",
    }
    _sessions[session_id] = {"status": "running", "result": None, "error": None}

    background_tasks.add_task(_run_workflow, session_id, revise_state)

    return SessionStatus(session_id=session_id, status="running")


@app.get("/resume/{session_id}/status", response_model=SessionStatus)
async def get_status(session_id: str):
    """Poll this endpoint until status is 'done' or 'error'."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found.")

    entry = _sessions[session_id]
    result = entry.get("result") or {}

    return SessionStatus(
        session_id=session_id,
        status=entry["status"],
        ats_score=result.get("ATSScore"),
        ats_attempts=result.get("ATSAttempts"),
        pdf_path=result.get("RenderedPDFPath"),
        yaml_path=result.get("ResumeYAMLPath"),
        final_summary=result.get("FinalSummary"),
        error=entry.get("error"),
    )


@app.get("/resume/{session_id}/pdf")
async def download_pdf(session_id: str):
    """Download the rendered PDF once status is 'done'."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found.")

    entry = _sessions[session_id]
    if entry["status"] != "done":
        raise HTTPException(status_code=409, detail=f"Session status is '{entry['status']}' — not ready.")

    pdf_path = Path(entry["result"].get("RenderedPDFPath", ""))
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found on disk.")

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=pdf_path.name,
    )
