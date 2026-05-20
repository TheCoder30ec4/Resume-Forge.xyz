import asyncio
import json
import re
import shutil
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

OUTPUT_ROOT = Path("output")


def make_basename(user_name: str | None, session_id: str) -> str:
    """Filesystem-safe `<username>_<session>` stem for output/ artifacts."""
    slug = re.sub(r"[^A-Za-z0-9]+", "_", user_name or "").strip("_") or "resume"
    return f"{slug}_{session_id}"


TEMPLATE_DIR = Path(__file__).resolve().parents[1] / "templates"
TEMPLATE_NAME = "resume_template.yaml"

# trim_blocks/lstrip_blocks: {% %} control lines emit no stray whitespace,
# so the rendered YAML keeps correct indentation.
_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    trim_blocks=True,
    lstrip_blocks=True,
)


def _strip_markdown_fence(text: str) -> str:
    payload = text.strip()
    if not payload.startswith("```"):
        return payload

    lines = payload.split("\n")
    if lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _normalize_dates(obj):
    """Recursively lowercase 'Present' → 'present' in end_date fields."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "end_date" and isinstance(v, str) and v.strip().lower() == "present":
                obj[k] = "present"
            else:
                _normalize_dates(v)
    elif isinstance(obj, list):
        for item in obj:
            _normalize_dates(item)


def _extract_cv(cv_payload: str) -> dict:
    """Parse the JSON draft and return the inner `cv` dict."""
    parsed = json.loads(_strip_markdown_fence(cv_payload))
    if not isinstance(parsed, dict):
        raise ValueError("Resume draft JSON must be an object.")
    cv = parsed.get("cv", parsed)
    if not isinstance(cv, dict):
        raise ValueError("Resume draft `cv` must be an object.")
    _normalize_dates(cv)
    return cv


def assemble_yaml(cv_payload: str) -> str:
    """Render the field-level Jinja2 template with the cv data from the JSON draft.

    Produces a complete RenderCV YAML: the `cv:` block filled field-by-field,
    plus the fixed design / locale / settings blocks from the template.
    """
    cv = _extract_cv(cv_payload)
    rendered = _jinja_env.get_template(TEMPLATE_NAME).render(cv=cv)
    return rendered.strip() + "\n"


def _rendercv_command() -> list[str]:
    executable = shutil.which("rendercv")
    if executable:
        return [executable]
    return [sys.executable, "-m", "rendercv"]


def save_yaml(cv_payload: str, name: str = "resume") -> Path:
    """Persist the assembled YAML (cv: + design/locale/settings) to `output/<name>.yaml`."""
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    yaml_path = OUTPUT_ROOT / f"{name}.yaml"
    yaml_path.write_text(assemble_yaml(cv_payload))
    return yaml_path.resolve()


async def render_cv(yaml_path: str | Path, theme: str | None = None) -> str:
    """Render an existing YAML file with `rendercv render` and return the PDF path.

    The PDF is written deterministically next to the YAML as `<yaml_stem>.pdf`
    (via rendercv's --pdf-path), so concurrent renders never collide and the
    caller always gets back the exact file it produced — not a stale PDF that
    happened to be first in a shared output folder.

    Pass `theme` to override the YAML's `design.theme` (rendercv's --design.theme flag).
    Built-in themes: classic, sb2nov, moderncv, engineeringresumes, engineeringclassic.
    """
    yaml_path = Path(yaml_path).resolve()
    if not yaml_path.exists():
        raise FileNotFoundError(yaml_path)

    cwd = yaml_path.parent
    pdf_name = f"{yaml_path.stem}.pdf"

    # --pdf-path resolves relative to the input file; -nohtml/-nopng/-nomd keep
    # the output folder clean since we only need the PDF.
    cmd = [
        *_rendercv_command(), "render", str(yaml_path),
        "--pdf-path", pdf_name,
        "-nohtml", "-nopng", "-nomd",
    ]
    if theme:
        cmd += ["--design.theme", theme]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(cwd),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(
            f"rendercv exited {proc.returncode}\n"
            f"stdout: {stdout.decode()}\nstderr: {stderr.decode()}"
        )

    pdf_file = cwd / pdf_name
    if not pdf_file.exists():
        raise RuntimeError(f"Expected PDF not produced at {pdf_file}")

    return str(pdf_file.resolve())
