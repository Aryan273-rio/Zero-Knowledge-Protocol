"""
database.py — MongoDB connection using Motor (async driver).
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING
from app.config import MONGO_URI, MONGO_DB

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient | None = None


def get_database():
    return client[MONGO_DB]


def get_users_collection():
    """Shortcut used by route handlers."""
    return get_database()["users"]


# Legacy alias so any code using get_db() still works
def get_db():
    return get_database()


async def connect_db():
    global client
    client = AsyncIOMotorClient(MONGO_URI)
    await client.admin.command("ping")
    logger.info("MongoDB connected. Database: %s", MONGO_DB)

    users = get_users_collection()
    await users.create_indexes([
        IndexModel([("username", ASCENDING)], unique=True)
    ])
    logger.info("Indexes ensured.")


async def close_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")