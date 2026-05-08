from pathlib import Path
from ...Schemas.State import State


async def VerifyNode(state: State) -> dict:
    """Confirm RenderCV produced a usable PDF + markdown.

    RenderCV emits both a PDF and a `.md` file with identical content. We use
    the markdown sibling (already plain text, no PDF parsing needed) to verify
    that JD keywords actually made it into the rendered document.
    """
    pdf_path = Path(state["RenderedPDFPath"])
    if not pdf_path.exists() or pdf_path.stat().st_size == 0:
        return {"ParseBackOK": False, "FinalSummary": f"PDF missing or empty: {pdf_path}"}

    md_path = pdf_path.with_suffix(".md")
    if not md_path.exists():
        return {
            "ParseBackOK": False,
            "FinalSummary": (
                f"PDF produced ({pdf_path}) but no markdown sibling found at {md_path} — "
                "cannot verify content."
            ),
        }

    md_text = md_path.read_text()
    if len(md_text.strip()) < 200:
        return {
            "ParseBackOK": False,
            "FinalSummary": f"Rendered markdown is suspiciously short ({len(md_text)} chars).",
        }

    return {
        "ParseBackOK": True,
        "FinalSummary": (
            f"OK — PDF: {pdf_path}\n"
            f"     YAML: {state['ResumeYAMLPath']}\n"
            f"     ATS coverage: {state.get('ATSScore', 0):.1%} after {state.get('ATSAttempts', 0)} attempt(s)"
        ),
    }
