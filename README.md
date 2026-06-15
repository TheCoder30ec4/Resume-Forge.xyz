# Resume-Forge.xyz

AI-powered, open-source resume builder. Generate, tailor, and export ATS-friendly resumes from your GitHub, LinkedIn, and a target job description — driven by an agentic workflow over LangGraph.

<img width="1472" height="2360" alt="image" src="https://github.com/user-attachments/assets/1789899d-bedb-47ea-9835-6697fe096456" />


## Features

- Job-description → tailored resume pipeline (gap analysis, ATS validation, verification)
- Pulls signals from GitHub repositories and LinkedIn profiles
- Renders to PDF / HTML / Markdown via [RenderCV](https://github.com/rendercv/rendercv)
- FastAPI backend with async workers (Redis-backed) and a Next.js 16 frontend
- Auth, profile setup, and run-history dashboard

## Repository Layout

```
Backend/
  api/            FastAPI service (controllers, services, models, workers)
  workflow/       LangGraph agents, prompts, tools, skills, templates
Frontend/
  resume-forge.xyz/   Next.js 16 + React 19 app (Tailwind v4, shadcn)
tests/            Pytest suite (unit, integration, e2e)
main.py           Backend entrypoint
```

## Prerequisites

- Python **3.12+**
- Node.js **20+**
- [uv](https://github.com/astral-sh/uv) for Python dependency management
- Redis (for the worker queue)
- A Groq API key (LLM provider used by the workflow)

## Quick Start

### 1. Backend

```bash
# from repo root
uv sync
cp .env.example .env   # then fill in GROQ_API_KEY, DATABASE_URL, REDIS_URL, JWT_SECRET, ...
uv run uvicorn Backend.api.main:app --reload
```

In a second terminal, start the worker:

```bash
uv run python -m Backend.api.workers.resume_worker
```

### 2. Frontend

> **Note:** This project uses Next.js 16. Some APIs and conventions differ from older versions — see `Frontend/resume-forge.xyz/AGENTS.md`.

```bash
cd Frontend/resume-forge.xyz
npm install
npm run dev
```

App runs on `http://localhost:3000`, API on `http://localhost:8000`.

## Testing

```bash
uv run pytest                              # all
uv run pytest -m "not integration"         # skip LLM-hitting tests
uv run pytest -m e2e                       # end-to-end
```

Integration tests require `GROQ_API` to be set.

## Tech Stack

**Backend:** FastAPI, SQLAlchemy 2, Alembic, asyncpg / aiosqlite, Redis, LangGraph, LangChain, deepagents, RenderCV, Playwright
**Frontend:** Next.js 16, React 19, Tailwind v4, shadcn/ui, Base UI, sonner

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, branch conventions, and PR checklist.

## License

See [LICENSE](LICENSE).
