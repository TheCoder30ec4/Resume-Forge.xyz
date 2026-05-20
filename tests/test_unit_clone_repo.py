"""Unit tests for the clone_repo tool — uses a real public micro-repo."""
import shutil
from pathlib import Path

import pytest

from Backend.workflow.tools.clone_repo import clone_repo, cleanup_repo


# Use the smallest stable public repo we can — the empty test repo from GitHub.
# octocat/Hello-World is ~1KB and never goes away.
_TEST_REPO_URL = "https://github.com/octocat/Hello-World.git"


@pytest.mark.skipif(shutil.which("git") is None, reason="git CLI not available")
async def test_clone_repo_creates_dir():
    path = await clone_repo(_TEST_REPO_URL)
    try:
        assert Path(path).exists()
        assert Path(path).is_dir()
        assert (Path(path) / "README").exists() or (Path(path) / "README.md").exists()
    finally:
        cleanup_repo(path)


async def test_clone_repo_invalid_url_raises():
    with pytest.raises(RuntimeError):
        await clone_repo("https://github.com/this-org-does-not-exist-12345/nope.git")


def test_cleanup_repo_idempotent(tmp_path):
    target = tmp_path / "fake"
    target.mkdir()
    cleanup_repo(str(target))
    assert not target.exists()
    cleanup_repo(str(target))  # second call must not raise
