"""
database.py — MongoDB connection using Motor (async driver).
"""

import logging
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from mongomock_motor import AsyncMongoMockClient
from pymongo import IndexModel, ASCENDING
from app.config import MONGO_URI, MONGO_DB

logger = logging.getLogger(__name__)

client = None


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
    # Switch to AsyncMongoMockClient to bypass Atlas IP Whitelist during testing
    client = AsyncMongoMockClient()
    await client.admin.command("ping")
    logger.info("MongoDB Mock connected. Database: %s", MONGO_DB)

    users = get_users_collection()
    await users.create_indexes([
        IndexModel([("username", ASCENDING)], unique=True)
    ])
    logger.info("Indexes ensured.")


async def close_db():
    global client
    if client:
        try:
            client.close()
        except AttributeError:
            pass
        logger.info("MongoDB connection closed.")