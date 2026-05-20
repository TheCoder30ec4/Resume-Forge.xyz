# Contributing to Resume-Forge.xyz

Thanks for your interest in contributing! This guide covers the workflow we use, conventions for code and commits, and what to expect during review.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Branching Model](#branching-model)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Reporting Bugs & Requesting Features](#reporting-bugs--requesting-features)

---

## Code of Conduct

Be respectful, assume good intent, and keep discussions focused on the work. Harassment, personal attacks, or discriminatory language won't be tolerated in issues, PRs, or any project space.

## Ways to Contribute

- **Bug fixes** — pick up an open issue labeled `bug` or file one.
- **Features** — open an issue first to discuss scope before opening a PR.
- **Docs** — README, inline docstrings, and this guide are fair game.
- **Tests** — coverage on the workflow nodes and API routes is always welcome.

## Development Setup

See the [Quick Start](README.md#quick-start) section of the README for full setup. TL;DR:

```bash
# Backend
uv sync
cp .env.example .env   # fill in secrets
uv run uvicorn Backend.api.main:app --reload

# Frontend
cd Frontend/resume-forge.xyz
npm install
npm run dev
```

You'll also need Redis running locally for the worker.

## Branching Model

- `main` — stable, deployable.
- `Frontend` — active integration branch for the current frontend/backend work.
- Feature branches: `feature/<short-name>` or `feat/<short-name>`
- Bug fixes: `fix/<short-name>`
- Chores / infra: `chore/<short-name>`

Branch from the integration branch (usually `Frontend`) unless a maintainer says otherwise. Rebase onto the latest upstream before opening a PR.

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

<optional body explaining the *why*>
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`.
**Scope examples:** `api`, `workflow`, `frontend`, `auth`, `onboarding`, `tests`.

Example:

```
feat(workflow): add ATS validator node retry on schema mismatch

The Groq response occasionally drops the `score` field; retry once
with a stricter prompt before failing the run.
```

Keep commits focused. Prefer a few small, reviewable commits over one giant one.

## Pull Request Process

1. **Open an issue first** for non-trivial changes so we can agree on direction.
2. **Branch + commit** following the conventions above.
3. **Run tests and linters** locally — see [Testing](#testing).
4. **Open the PR** against the appropriate integration branch with:
   - A clear title (Conventional Commit style)
   - A summary of *what* and *why*
   - Screenshots / GIFs for UI changes
   - A "Test plan" checklist
5. **Address review feedback** by pushing follow-up commits (don't force-push during review unless asked).
6. A maintainer will squash-merge once CI is green and at least one approval is in.

### PR Checklist

- [ ] Branch is rebased on the target branch
- [ ] Tests added or updated
- [ ] `uv run pytest` passes (or relevant subset)
- [ ] `npm run lint` passes for frontend changes
- [ ] No secrets, `.env`, or generated artifacts (`output/`, `*.db`) included
- [ ] Docs/README updated if behavior changed

## Coding Standards

### Python (Backend)

- Python 3.12+, type hints required on public functions
- Async by default for I/O (FastAPI, SQLAlchemy async, httpx)
- Keep workflow nodes pure: input state in, output state out — no hidden globals
- Prompts live next to their agent (`*Prompt.py`)
- Use `Backend/api/utils/logger.py` instead of `print`

### TypeScript (Frontend)

- Next.js 16 / React 19 — **check `Frontend/resume-forge.xyz/AGENTS.md`**; APIs differ from older Next.js
- Tailwind v4 utility classes; shared primitives in `components/ui/`
- Co-locate route-specific components under the route folder
- Use the existing `lib/api.ts` client; don't hand-roll `fetch` calls

### General

- No commented-out code in PRs
- Don't add comments that restate what the code does — comment only non-obvious *why*
- Don't introduce new dependencies without flagging it in the PR description

## Testing

```bash
# Python
uv run pytest                          # everything
uv run pytest -m "not integration"     # skip LLM-hitting tests
uv run pytest tests/test_unit_<x>.py   # targeted

# Frontend
cd Frontend/resume-forge.xyz
npm run lint
npm run build                          # catches type / build errors
```

- **Unit** tests: mock external APIs, no network.
- **Integration** tests: require `GROQ_API` set; marked with `@pytest.mark.integration`.
- **E2E** tests: marked with `@pytest.mark.e2e`; may hit external services and are slow.

## Reporting Bugs & Requesting Features

Open a GitHub issue with:

- **Bug:** what you ran, what you expected, what happened, environment (OS, Python/Node version), and logs / stack trace.
- **Feature:** the problem you're trying to solve and a sketch of the proposed solution. Discuss before implementing.

---

Thanks for helping make Resume-Forge better.
