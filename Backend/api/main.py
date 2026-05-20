"""Backend API entry point.

Run with:
    uv run uvicorn Backend.api.main:app --reload --port 8000
"""
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from Backend.api.config.settings import get_settings
from Backend.api.database.base import create_tables
from Backend.api.controllers.auth_controller import router as auth_router
from Backend.api.controllers.user_controller import router as user_router
from Backend.api.controllers.resume_controller import router as resume_router
from Backend.api.utils.logger import log, http_log, _file_handler

settings = get_settings()

# Route uvicorn's own loggers into the rotating file too, so server startup,
# access lines and crashes land in logs/backend.log alongside app logs.
for _name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
    logging.getLogger(_name).addHandler(_file_handler())


async def _recover_orphaned_sessions():
    """Mark sessions left mid-run as errored.

    Workflow runs are in-process background tasks — a backend restart kills any
    that were in flight, leaving them stuck on 'running'/'pending' forever.
    """
    from sqlalchemy import update
    from Backend.api.database.base import AsyncSessionLocal
    from Backend.api.models.resume import ResumeSession

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            update(ResumeSession)
            .where(ResumeSession.status.in_(["running", "pending"]))
            .values(status="error", error_message="Interrupted by a server restart — please retry.")
        )
        await db.commit()
        if result.rowcount:
            log.info(f"Recovered {result.rowcount} orphaned session(s) → error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info(f"Starting {settings.APP_NAME} [{settings.ENV}]")
    await create_tables()
    log.info("Database tables ready")
    await _recover_orphaned_sessions()
    yield
    log.info("Shutting down")


app = FastAPI(
    title="ResumeBuilder API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every HTTP request: method, path, status, and duration."""
    req_id = uuid.uuid4().hex[:8]
    started = time.perf_counter()
    client = request.client.host if request.client else "-"
    http_log.info(f"[{req_id}] → {request.method} {request.url.path} from {client}")

    try:
        response = await call_next(request)
    except Exception:
        elapsed = (time.perf_counter() - started) * 1000
        http_log.exception(
            f"[{req_id}] ✗ {request.method} {request.url.path} unhandled error after {elapsed:.0f}ms"
        )
        raise

    elapsed = (time.perf_counter() - started) * 1000
    level = logging.WARNING if response.status_code >= 400 else logging.INFO
    http_log.log(
        level,
        f"[{req_id}] ← {request.method} {request.url.path} {response.status_code} ({elapsed:.0f}ms)",
    )
    response.headers["X-Request-ID"] = req_id
    return response


app.include_router(auth_router)
app.include_router(user_router)
app.include_router(resume_router)


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.ENV}
