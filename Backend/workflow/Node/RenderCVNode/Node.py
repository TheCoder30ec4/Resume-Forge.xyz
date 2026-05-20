from ...Schemas.State import State
from ...tools.render_cv import save_yaml, render_cv, make_basename


async def RenderCVNode(state: State) -> dict:
    basename = make_basename(state.get("UserName"), state["session_id"])
    yaml_path = save_yaml(state["ResumeDraft"], name=basename)
    pdf_path = await render_cv(yaml_path, theme=state.get("Theme") or None)
    return {"ResumeYAMLPath": str(yaml_path), "RenderedPDFPath": pdf_path}
