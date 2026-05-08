import asyncio
from pathlib import Path

OUTPUT_ROOT = Path("output")
TEMPLATE_PATH = Path(__file__).resolve().parents[1] / "templates" / "default_design.yaml"


def assemble_yaml(cv_yaml: str) -> str:
    """Concatenate the writer's `cv:` block with the fixed design/locale/settings template."""
    template = TEMPLATE_PATH.read_text()
    cv_block = cv_yaml.strip()
    if cv_block.startswith("```"):
        # Strip accidental markdown fences
        lines = cv_block.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        cv_block = "\n".join(lines).strip()
    return f"{cv_block}\n\n{template}"


def save_yaml(cv_yaml: str, name: str = "resume") -> Path:
    """Persist the assembled YAML (cv: + design/locale/settings) to `output/<name>.yaml`."""
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    yaml_path = OUTPUT_ROOT / f"{name}.yaml"
    yaml_path.write_text(assemble_yaml(cv_yaml))
    return yaml_path.resolve()


async def render_cv(yaml_path: str | Path, theme: str | None = None) -> str:
    """Render an existing YAML file with `rendercv render` and return the PDF path.

    Pass `theme` to override the YAML's `design.theme` (rendercv's --design.theme flag).
    Built-in themes: classic, sb2nov, moderncv, engineeringresumes, engineeringclassic.
    """
    yaml_path = Path(yaml_path).resolve()
    if not yaml_path.exists():
        raise FileNotFoundError(yaml_path)

    cwd = yaml_path.parent
    cmd = ["rendercv", "render", str(yaml_path)]
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

    rendercv_output = cwd / "rendercv_output"
    pdfs = list(rendercv_output.glob("*.pdf"))
    if not pdfs:
        raise RuntimeError(f"No PDF produced in {rendercv_output}")

    return str(pdfs[0].resolve())
