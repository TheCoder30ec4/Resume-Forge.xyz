"""Background workers that run the LangGraph workflow and background repo summarization."""
import asyncio
import json
from pathlib import Path


def _try_json(value):
    """Parse value as JSON if it's a non-empty string, otherwise return as-is."""
    if not value:
        return None
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value

from sqlalchemy.ext.asyncio import AsyncSession

from Backend.api.config.settings import get_settings
from Backend.api.database.base import AsyncSessionLocal
from Backend.api.database.redis import cache_set, cache_get, key_github_repo_summary
from Backend.api.models.resume import ResumeSession
from Backend.api.services.resume_service import update_session_status, create_version
from Backend.api.utils.logger import worker_log, resume_log
from Backend.workflow.workflow import workflow_with_memory

settings = get_settings()

# Upper bound on a single workflow run. Covers JD + GitHub/LinkedIn + gap +
# the write↔ATS retry loop + render. Exceeding it marks the session "error".
WORKFLOW_TIMEOUT_SECONDS = 900


async def run_resume_workflow(session_db_id: str, langgraph_state: dict) -> None:
    """Run the full LangGraph pipeline for a session and persist results to DB."""
    async with AsyncSessionLocal() as db:
        session = await db.get(ResumeSession, session_db_id)
        if not session:
            worker_log.error(f"Session {session_db_id} not found in DB")
            return

        config = {"configurable": {"thread_id": session.session_id}}
        resume_log.info(f"[{session.session_id}] Starting workflow run")

        try:
            await update_session_status(db, session, status="running")
            await db.commit()

            # Hard timeout: a node hanging on a network/LLM call with no timeout
            # of its own would otherwise leave the session "running" forever.
            final = await asyncio.wait_for(
                workflow_with_memory.ainvoke(langgraph_state, config=config),
                timeout=WORKFLOW_TIMEOUT_SECONDS,
            )

            # Read PDF from disk to store as blob
            pdf_blob: bytes | None = None
            pdf_path = final.get("RenderedPDFPath", "")
            if pdf_path and Path(pdf_path).exists():
                pdf_blob = Path(pdf_path).read_bytes()

            resume_draft = _try_json(final.get("ResumeDraft", "{}")) or {}

            # Persist version
            await db.refresh(session)
            version = await create_version(
                db=db,
                session=session,
                user_input=langgraph_state.get("user_input"),
                resume_draft=resume_draft,
                pdf_blob=pdf_blob,
                ats_score=final.get("ATSScore", 0.0),
                ats_report={"report": final.get("ATSReport", "")},
            )

            # Update session with cached pipeline outputs for fast revise
            await update_session_status(
                db=db,
                session=session,
                status="done",
                ats_score=final.get("ATSScore", 0.0),
                ats_attempts=final.get("ATSAttempts", 0),
                ats_report={"report": final.get("ATSReport", "")},
                jd_analysis=_try_json(final.get("JDAnalysis")),
                linkedin_summary=final.get("LinkedinSummary"),
                github_project_summary=final.get("GithubProjectSummary"),
                gap_analysis={"text": final.get("GapAnalysis")} if final.get("GapAnalysis") else None,
            )
            await db.commit()
            resume_log.info(f"[{session.session_id}] Done — ATS {final.get('ATSScore', 0):.1%}, version {version.version_number}")

        except Exception as exc:
            msg = (
                f"Generation timed out after {WORKFLOW_TIMEOUT_SECONDS // 60} minutes."
                if isinstance(exc, (asyncio.TimeoutError, TimeoutError))
                else str(exc) or "Workflow failed."
            )
            worker_log.error(f"[{session.session_id}] Workflow failed: {msg}", exc_info=True)
            await db.rollback()
            async with AsyncSessionLocal() as err_db:
                err_session = await err_db.get(ResumeSession, session_db_id)
                if err_session:
                    await update_session_status(err_db, err_session, status="error", error_message=msg)
                    await err_db.commit()


async def summarize_remaining_repos_background(
    user_id: str,
    all_repos: list[str],
    priority_repos: list[str],
    github_token: str | None,
    jd_analysis: str,
) -> None:
    """Summarize all repos the user connected that weren't selected for this JD.
    Results go into Redis so future sessions can use them without re-generating."""
    remaining = [r for r in all_repos if r not in priority_repos]
    if not remaining:
        return

    from Backend.workflow.tools.get_github_repos import get_github_repos
    from Backend.workflow.Node.GithubNode.Agent import make_summarize_agent
    import tempfile, shutil

    worker_log.info(f"[user:{user_id}] Background summarizing {len(remaining)} repos")

    for repo in remaining:
        cache_key = key_github_repo_summary(user_id, repo)
        if await cache_get(cache_key):
            continue  # already cached

        try:
            repos_data = await asyncio.to_thread(get_github_repos, [repo], github_token)
            if not repos_data:
                continue

            repo_info = repos_data[0]
            clone_url = repo_info.get("clone_url", "")
            if not clone_url:
                continue

            # Clone + summarize
            tmpdir = tempfile.mkdtemp()
            try:
                proc = await asyncio.create_subprocess_exec(
                    "git", "clone", "--depth=1", clone_url, tmpdir,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                )
                await proc.wait()

                agent = make_summarize_agent(tmpdir)
                from langchain_core.messages import HumanMessage
                result = await agent.ainvoke({
                    "messages": [HumanMessage(content=f"Summarize this repository.\n\nJD context:\n{jd_analysis}")]
                })
                summary = result["messages"][-1].content
                await cache_set(cache_key, {"repo": repo, "summary": summary}, ttl=settings.GITHUB_REPO_CACHE_TTL)
                worker_log.info(f"[user:{user_id}] Summarized background repo: {repo}")
            finally:
                shutil.rmtree(tmpdir, ignore_errors=True)

        except Exception as e:
            worker_log.warning(f"[user:{user_id}] Failed to summarize {repo}: {e}")
