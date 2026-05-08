import asyncio
import shutil
import tempfile
from pathlib import Path


async def clone_repo(url: str, depth: int = 1) -> str:
    """Shallow-clone a GitHub repo to a temp dir and return the absolute path.

    Caller is responsible for cleanup via cleanup_repo(path). Uses --depth=1
    by default so we never pull full history. Returns the local checkout path
    that the deepagent's filesystem tools (ls, read_file, glob, grep) can walk.
    """
    target = Path(tempfile.mkdtemp(prefix="repoclone_"))
    proc = await asyncio.create_subprocess_exec(
        "git", "clone", "--depth", str(depth), "--quiet", url, str(target),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        shutil.rmtree(target, ignore_errors=True)
        raise RuntimeError(f"git clone {url} failed: {stderr.decode()[:500]}")
    return str(target)


def cleanup_repo(path: str) -> None:
    """Remove a cloned repo directory. Safe to call on a missing path."""
    shutil.rmtree(path, ignore_errors=True)
