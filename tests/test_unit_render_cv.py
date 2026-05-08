"""Unit tests for the render_cv tool — YAML assembly and rendercv invocation."""
import shutil
import subprocess
from pathlib import Path

import pytest

from app.tools.render_cv import assemble_yaml, save_yaml, render_cv


def test_assemble_yaml_concatenates_template(sample_resume_yaml):
    full = assemble_yaml(sample_resume_yaml)
    assert full.startswith("cv:")
    assert "design:" in full
    assert "locale:" in full
    assert "settings:" in full
    assert "theme: sb2nov" in full


def test_assemble_yaml_strips_markdown_fences(sample_resume_yaml):
    fenced = f"```yaml\n{sample_resume_yaml}\n```"
    full = assemble_yaml(fenced)
    assert "```" not in full
    assert full.startswith("cv:")


def test_save_yaml_writes_to_output_dir(sample_resume_yaml, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    path = save_yaml(sample_resume_yaml, name="unit_test")
    assert path.exists()
    assert path.name == "unit_test.yaml"
    content = path.read_text()
    assert content.startswith("cv:")
    assert "design:" in content


@pytest.mark.skipif(shutil.which("rendercv") is None, reason="rendercv CLI not installed")
async def test_render_cv_produces_pdf(sample_resume_yaml, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    yaml_path = save_yaml(sample_resume_yaml, name="render_test")
    pdf_path = await render_cv(yaml_path)
    assert Path(pdf_path).exists()
    assert pdf_path.endswith(".pdf")
    assert Path(pdf_path).stat().st_size > 1000


async def test_render_cv_missing_file_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        await render_cv(tmp_path / "nonexistent.yaml")
