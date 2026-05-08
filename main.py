import argparse
import asyncio
import uuid
from pathlib import Path

from app.workflow import build_workflow


def _initial_state(jd_text: str, theme: str, user_input: str | None) -> dict:
    return {
        "JD": jd_text,
        "user_input": user_input,
        "session_id": str(uuid.uuid4())[:8],
        "JDAnalysis": "",
        "LinkedinSummary": "",
        "GithubProjectSummary": [],
        "GapAnalysis": "",
        "ResumeDraft": "",
        "ResumeYAMLPath": "",
        "ATSScore": 0.0,
        "ATSReport": "",
        "ATSAttempts": 0,
        "UserApproved": False,
        "Theme": theme,
        "RenderedPDFPath": "",
        "ParseBackOK": False,
        "FinalSummary": "",
    }


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--jd", default="jd.txt", help="Path to a file containing the job description")
    parser.add_argument(
        "--theme",
        default="classic",
        help="RenderCV theme: classic, sb2nov, moderncv, engineeringresumes, engineeringclassic",
    )
    parser.add_argument("--user-input", default=None, help="Optional extra user guidance")
    args = parser.parse_args()

    jd_path = Path(args.jd)
    if not jd_path.exists():
        raise SystemExit(f"JD file not found: {jd_path}")

    app = build_workflow()
    state = _initial_state(jd_path.read_text(), args.theme, args.user_input)

    final = await app.ainvoke(state)

    print("\n" + "=" * 70)
    print(final["FinalSummary"])
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
