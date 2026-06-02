"""
routes/register.py — POST /api/register

Handles new user registration.
Only the public key y = G^x mod P is accepted and stored.
The secret key x never reaches this server.
"""

import logging
from fastapi import APIRouter, HTTPException
from pymongo.errors import DuplicateKeyError

from app.database import get_db
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
    """
    Registration endpoint.

    Flow:
      1. Validate username format
      2. Validate public key membership in the Schnorr subgroup
      3. Check username uniqueness
      4. Insert user document (username + public_key_y only)

    The server NEVER receives or stores:
      - passwords
      - password hashes
      - secret keys
      - salts
    """
    logger.info("Registration attempt for username='%s'", payload.username)

    # Step 1 — Sanitize and validate username
    username = validate_username(payload.username)

    # Step 2 — Validate public key (range + subgroup membership)
    validate_public_key(payload.public_key_y)

    # Step 3 & 4 — Insert into MongoDB; unique index enforces no duplicates
    # Step 3 & 4 — Insert into MongoDB; unique index enforces no duplicates
    db = get_db()
    try:
        await db["users"].insert_one({
            "username": username,
            "public_key_y": str(payload.public_key_y),  # FIX: Store as string to bypass MongoDB 8-byte limit
        })
        logger.info("Registration successful for username='%s'", username)
    except DuplicateKeyError:
        logger.warning("Registration failed — duplicate username='%s'", username)
        raise HTTPException(
            status_code=400,
            detail=f"Username '{username}' is already taken.",
        )

    return RegisterResponse()