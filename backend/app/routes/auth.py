"""
routes/auth.py — POST /api/auth/commit and POST /api/auth/verify
"""

import logging
import secrets
from fastapi import APIRouter, HTTPException

from app.database import get_users_collection
from app.schemas.auth import CommitRequest, CommitResponse, VerifyRequest, VerifyResponse
from app.services.schnorr import generate_challenge, verify_proof
from app.services.session_manager import create_session, get_and_consume_session
from app.utils.validators import validate_username, validate_commitment, validate_response

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/auth/commit",
    response_model=CommitResponse,
    status_code=200,
    summary="Step 1: Submit commitment r = G^k mod P, receive challenge e",
)
async def commit(payload: CommitRequest) -> CommitResponse:
    logger.info("Auth commit attempt for username='%s'", payload.username)

    username = validate_username(payload.username)
    validate_commitment(payload.commitment_r)

    users = get_users_collection()
    user = await users.find_one({"username": username})
    if user is None:
        logger.warning("Auth commit failed — unknown username='%s'", username)
        raise HTTPException(
            status_code=404,
            detail=f"User '{username}' not found. Please register first.",
        )

    challenge_e = generate_challenge()
    session_id = create_session(
        username=username,
        commitment_r=payload.commitment_r,
        challenge_e=challenge_e,
    )

    logger.info("Challenge issued for username='%s' | session_id=%s", username, session_id)

    # Return challenge_e as str — frontend converts to BigInt (since JSON floats lose precision)
    return CommitResponse(session_id=session_id, challenge_e=str(challenge_e))


@router.post(
    "/auth/verify",
    response_model=VerifyResponse,
    status_code=200,
    summary="Step 2: Submit response s = (k + e·x) mod Q for verification",
)
async def verify(payload: VerifyRequest) -> VerifyResponse:
    logger.info("Verification started for session_id=%s", payload.session_id)

    validate_response(payload.response_s)

    session = get_and_consume_session(payload.session_id)
    if session is None:
        raise HTTPException(
            status_code=400,
            detail="Session not found or expired. Please restart the login flow.",
        )

    logger.info("Verification started for username='%s'", session.username)

    users = get_users_collection()
    user = await users.find_one({"username": session.username})
    if user is None:
        logger.error("User '%s' disappeared between commit and verify.", session.username)
        raise HTTPException(status_code=404, detail="User not found.")

    public_key_y = int(user["public_key_y"])  # Stored as string, cast back to int

    valid = verify_proof(
        public_key_y=public_key_y,
        commitment_r=session.commitment_r,
        challenge_e=session.challenge_e,
        response_s=payload.response_s,
    )

    if valid:
        mock_token = f"dev_token_{secrets.token_hex(16)}"
        logger.info("Verification successful for username='%s'", session.username)
        return VerifyResponse(authenticated=True, token=mock_token)
    else:
        logger.warning("Verification failed for username='%s'", session.username)
        raise HTTPException(status_code=401, detail="Zero-knowledge proof failed.")