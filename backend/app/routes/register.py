"""
routes/register.py — POST /api/register
"""

import logging
from fastapi import APIRouter, HTTPException
from pymongo.errors import DuplicateKeyError

from app.database import get_users_collection
from app.schemas.user import RegisterRequest, RegisterResponse
from app.utils.validators import validate_username, validate_public_key

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=201,
    summary="Register a new user with their Schnorr public key",
)
async def register(payload: RegisterRequest) -> RegisterResponse:
    logger.info("Registration attempt for username='%s'", payload.username)

    username = validate_username(payload.username)
    validate_public_key(payload.public_key_y)

    try:
        users = get_users_collection()
        await users.insert_one({
            "username": username,
            "public_key_y": str(payload.public_key_y),  # Store as string — MongoDB int limit
        })
        logger.info("Registration successful for username='%s'", username)
    except DuplicateKeyError:
        logger.warning("Registration failed — duplicate username='%s'", username)
        raise HTTPException(
            status_code=400,
            detail=f"Username '{username}' is already taken.",
        )

    return RegisterResponse()


@router.get(
    "/debug/users",
    status_code=200,
    summary="[DEBUG] View all registered users in the database",
)
async def get_all_users() -> dict:
    users = get_users_collection()
    cursor = users.find({})
    user_list = await cursor.to_list(length=100)
    
    # Remove the MongoDB internal _id for clean JSON display
    for u in user_list:
        u.pop("_id", None)
        
    return {"registered_users": user_list}