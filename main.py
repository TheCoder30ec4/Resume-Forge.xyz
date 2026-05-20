"""Entry point for the ResumeBuilder CLI.

First run (new resume):
    uv run python main.py --jd jd.txt --linkedin-url <url> --github-repos owner/a,owner/b

Rerun to revise with user feedback (same session):
    uv run python main.py --session-id <id> --user-input "Make the summary shorter"

The session state is held in memory for the lifetime of the process. For persistent
cross-process sessions, swap MemorySaver for SqliteSaver or RedisSaver in workflow.py.
"""
import argparse
import asyncio
import os
import uuid
from pathlib import Path

from Backend.workflow.workflow import workflow_with_memory


def _initial_state(
    jd_text: str,
    theme: str,
    user_input: str | None,
    linkedin_url: str,
    github_repos: list[str],
    github_token: str | None,
    session_id: str,
) -> dict:
    return {
        "JD": jd_text,
        "user_input": user_input,
        "session_id": session_id,
        "LinkedinURL": linkedin_url,
        "GithubRepos": github_repos,
        "GithubToken": github_token,
        # Intermediate fields — empty on first run, restored from checkpoint on rerun
        "JDAnalysis": "",
        "LinkedinSummary": "",
        "GithubProjectSummary": [],
        "GapAnalysis": "",
        "ResumeDraft": "",
        "ResumeYAMLPath": "",
        "ATSScore": 0.0,
        "ATSReport": "",
        "ATSAttempts": 0,
        "Theme": theme,
        "RenderedPDFPath": "",
        "ParseBackOK": False,
        "FinalSummary": "",
    }


async def main():
    parser = argparse.ArgumentParser(description="ResumeBuilder — AI-powered resume tailoring")
    parser.add_argument("--jd",           default="jd.txt",      help="Path to job description file")
    parser.add_argument("--theme",        default="classic",      help="RenderCV theme: classic, sb2nov, moderncv, engineeringresumes, engineeringclassic")
    parser.add_argument("--user-input",   default=None,           help="Optional guidance or revision instructions")
    parser.add_argument("--session-id",   default=None,           help="Resume an existing session (for revisions)")
    parser.add_argument("--linkedin-url", default=os.getenv("LINKEDIN_URL"),  help="LinkedIn profile URL")
    parser.add_argument("--github-repos", default=os.getenv("GITHUB_REPOS", ""), help="Comma-separated owner/repo names, 2-10")
    args = parser.parse_args()

    is_rerun = args.session_id is not None
    session_id = args.session_id or str(uuid.uuid4())[:8]

    # Thread config — LangGraph uses this to namespace checkpointed state
    config = {"configurable": {"thread_id": session_id}}

    if is_rerun:
        # Rerun: only update user_input in the existing checkpoint and re-enter at write
        print(f"[session {session_id}] Rerunning with updated user input → re-entering at write node")
        update = {"user_input": args.user_input, "ATSAttempts": 0}
        final = await workflow_with_memory.ainvoke(update, config=config)
    else:
        # First run: validate inputs and build full initial state
        if not args.linkedin_url:
            raise SystemExit("No LinkedIn URL — pass --linkedin-url or set LINKEDIN_URL.")

        github_repos = [r.strip() for r in args.github_repos.split(",") if r.strip()]
        if not (2 <= len(github_repos) <= 10):
            raise SystemExit("Connect 2-10 GitHub repos — pass --github-repos 'owner/a,owner/b' or set GITHUB_REPOS.")

        jd_path = Path(args.jd)
        if not jd_path.exists():
            raise SystemExit(f"JD file not found: {jd_path}")

        state = _initial_state(
            jd_text=jd_path.read_text(),
            theme=args.theme,
            user_input=args.user_input,
            linkedin_url=args.linkedin_url,
            github_repos=github_repos,
            github_token=os.getenv("GITHUB_TOKEN"),
            session_id=session_id,
        )

        print(f"[session {session_id}] Starting new resume build")
        final = await workflow_with_memory.ainvoke(state, config=config)

    # ── Print results ──────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print(f"Session ID : {session_id}  (use --session-id {session_id} to revise)")
    print(f"ATS Score  : {final.get('ATSScore', 0):.1%} after {final.get('ATSAttempts', 0)} attempt(s)")
    print(f"PDF        : {final.get('RenderedPDFPath', '(not rendered)')}")
    print(f"YAML       : {final.get('ResumeYAMLPath', '(not saved)')}")
    print("-" * 70)
    print(final.get("FinalSummary", ""))
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
