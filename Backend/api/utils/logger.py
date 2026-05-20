import logging
import sys
from functools import lru_cache
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Logs persist to logs/backend.log (rotating) in addition to stdout.
# logger.py lives at Backend/api/utils/ → parents[3] is the repo root.
LOG_DIR = Path(__file__).resolve().parents[3] / "logs"
LOG_FILE = LOG_DIR / "backend.log"
MAX_BYTES = 5 * 1024 * 1024   # 5 MB per file
BACKUP_COUNT = 5              # keep 5 rotated files


@lru_cache
def _file_handler() -> RotatingFileHandler:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler(
        LOG_FILE, maxBytes=MAX_BYTES, backupCount=BACKUP_COUNT, encoding="utf-8"
    )
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
    return handler


@lru_cache
def get_logger(name: str = "resumebuilder") -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)
    formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

    stream = logging.StreamHandler(sys.stdout)
    stream.setFormatter(formatter)
    logger.addHandler(stream)

    logger.addHandler(_file_handler())

    logger.propagate = False
    return logger


# Module-level convenience loggers
log = get_logger("resumebuilder")
auth_log = get_logger("resumebuilder.auth")
resume_log = get_logger("resumebuilder.resume")
worker_log = get_logger("resumebuilder.worker")
cache_log = get_logger("resumebuilder.cache")
http_log = get_logger("resumebuilder.http")
