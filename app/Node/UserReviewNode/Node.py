import asyncio
from ...Schemas.State import State


async def UserReviewNode(state: State) -> dict:
    """Pause for user review of the resume draft.

    Prints the draft, asks for accept / edit / regenerate. In edit mode the user
    pastes a replacement draft (terminated by a line containing only 'EOF').
    Reads stdin in a thread so the LangGraph event loop is not blocked.
    """
    print("\n" + "=" * 70)
    print("RESUME DRAFT (ATS score: {:.1%})".format(state.get("ATSScore", 0.0)))
    print("=" * 70)
    print(state["ResumeDraft"])
    print("=" * 70)
    print(f"\nATS report:\n{state.get('ATSReport', '(none)')}\n")

    def _ask() -> tuple[bool, str]:
        choice = input("Action — [a]ccept / [e]dit / [r]egenerate: ").strip().lower()
        if choice.startswith("e"):
            print("Paste replacement draft, terminate with a line containing only 'EOF':")
            lines: list[str] = []
            while True:
                line = input()
                if line.strip() == "EOF":
                    break
                lines.append(line)
            return True, "\n".join(lines)
        if choice.startswith("r"):
            return False, state["ResumeDraft"]
        return True, state["ResumeDraft"]

    approved, new_draft = await asyncio.to_thread(_ask)
    return {"UserApproved": approved, "ResumeDraft": new_draft}
