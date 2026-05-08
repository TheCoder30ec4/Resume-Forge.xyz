from ...Schemas.State import State
from ...tools.render_cv import save_yaml, render_cv


async def RenderCVNode(state: State) -> dict:
    yaml_path = save_yaml(state["ResumeDraft"], name=f"resume_{state['session_id']}")
    pdf_path = await render_cv(yaml_path, theme=state.get("Theme") or None)
    return {"ResumeYAMLPath": str(yaml_path), "RenderedPDFPath": pdf_path}
