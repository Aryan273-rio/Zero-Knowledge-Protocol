"""
main.py — FastAPI application factory.

Wires together:
  - CORS middleware (permissive for local dev + Wireshark inspection)
  - MongoDB lifecycle (connect on startup, close on shutdown)
  - Route registration
  - Structured logging
  - Periodic session cleanup background task
"""

import asyncio
import logging
import logging.config

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_TITLE, APP_VERSION, SESSION_TTL_SECONDS
from app.database import connect_db, close_db
from app.routes import register, auth
from app.services.session_manager import purge_expired_sessions

# ── Logging setup ──────────────────────────────────────────────────────────────

logging.config.dictConfig({
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "structured": {
            "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "structured",
        }
    },
    "root": {
        "level": "INFO",
        "handlers": ["console"],
    },
})

logger = logging.getLogger(__name__)

# ── Application factory ────────────────────────────────────────────────────────

app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description=(
        "Zero-Knowledge Proof authentication using the Schnorr Identification Protocol. "
        "Users prove knowledge of their secret key without ever transmitting it."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Permissive for local development — allows Wireshark packet inspection
# on plain HTTP. Restrict origins in production.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────────────────────

app.include_router(register.router, prefix="/api", tags=["Registration"])
app.include_router(auth.router, prefix="/api", tags=["Authentication"])


# ── Lifecycle ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup() -> None:
    """Connect to MongoDB and start the session cleanup task."""
    logger.info("Starting ZKP Auth server...")
    await connect_db()
    asyncio.create_task(_session_cleanup_loop())
    logger.info("Server ready.")


@app.on_event("shutdown")
async def shutdown() -> None:
    """Gracefully close the MongoDB connection."""
    logger.info("Shutting down ZKP Auth server...")
    await close_db()


async def _session_cleanup_loop() -> None:
    """
    Background task: purge expired sessions every SESSION_TTL_SECONDS.

    Without this, abandoned sessions (where the client never called verify)
    would accumulate in memory indefinitely.
    """
    while True:
        await asyncio.sleep(SESSION_TTL_SECONDS)
        count = purge_expired_sessions()
        if count:
            logger.info("Background cleanup: removed %d expired session(s).", count)


# ── Health check ───────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health() -> dict:
    """Simple liveness probe."""
    return {"status": "ok", "service": APP_TITLE, "version": APP_VERSION}