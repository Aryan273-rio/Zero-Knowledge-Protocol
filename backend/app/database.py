"""
database.py — MongoDB connection via Motor (async driver).

Motor wraps PyMongo for use with asyncio/FastAPI.
The client is created once at startup and reused across requests.
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import MONGO_URI, MONGO_DB_NAME

logger = logging.getLogger(__name__)

# Module-level client — initialized at startup, closed at shutdown
_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    """
    Open the MongoDB connection and ensure required indexes exist.
    Called once during FastAPI startup.
    """
    global _client, _db

    logger.info("Connecting to MongoDB at %s", MONGO_URI)
    _client = AsyncIOMotorClient(MONGO_URI)
    _db = _client[MONGO_DB_NAME]

    # Unique index on username — enforced at the database level
    # so duplicate registrations are rejected even under concurrent load
    await _db["users"].create_index("username", unique=True)
    logger.info("MongoDB connected. Database: %s", MONGO_DB_NAME)


async def close_db() -> None:
    """Close the MongoDB connection. Called during FastAPI shutdown."""
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed.")


def get_db() -> AsyncIOMotorDatabase:
    """
    Return the active database instance.
    Raises RuntimeError if called before connect_db().
    """
    if _db is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return _db