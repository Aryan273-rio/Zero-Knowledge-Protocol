"""
routes/auth.py — POST /api/auth/commit and POST /api/auth/verify

Implements the two-round Schnorr identification handshake.

Round 1 (commit):  Client sends commitment r, server returns challenge e + session_id
Round 2 (verify):  Client sends response s, server verifies G^s == r·y^e (mod P)
"""

import logging
import secrets
from fastapi import APIRouter, HTTPException

from app.database import get_db
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
    """
    Commitment endpoint — Round 1 of the Schnorr handshake.

    Flow:
      1. Validate username format
      2. Validate commitment r is in range (1, P)
      3. Look up user in database
      4. Generate random challenge e ∈ (1, Q)
      5. Create a single-use session storing (username, r, e)
      6. Return session_id and challenge e

    The session_id decouples this from username-based session attacks:
    multiple simultaneous logins for the same user are supported.
    """
    logger.info("Auth commit attempt for username='%s'", payload.username)

    # Validate inputs
    username = validate_username(payload.username)
    validate_commitment(payload.commitment_r)

    # Look up user — must exist before we issue a challenge
    db = get_db()
    user = await db["users"].find_one({"username": username})
    if user is None:
        logger.warning("Auth commit failed — unknown username='%s'", username)
        raise HTTPException(
            status_code=404,
            detail=f"User '{username}' not found. Please register first.",
        )

    # Generate challenge and session
    challenge_e = generate_challenge()
    session_id = create_session(
        username=username,
        commitment_r=payload.commitment_r,
        challenge_e=challenge_e,
    )

    logger.info(
        "Challenge issued for username='%s' | session_id=%s",
        username,
        session_id,
    )

    return CommitResponse(session_id=session_id, challenge_e=str(challenge_e))


@router.post(
    "/auth/verify",
    response_model=VerifyResponse,
    status_code=200,
    summary="Step 2: Submit response s = (k + e·x) mod Q for verification",
)
async def verify(payload: VerifyRequest) -> VerifyResponse:
    """
    Verification endpoint — Round 2 of the Schnorr handshake.

    Flow:
      1. Validate response s is in range [0, Q)
      2. Look up and consume the session (single-use, TTL-checked)
      3. Load user's public key y from database
      4. Compute G^s mod P and r·y^e mod P
      5. Compare — grant or deny

    The session is ALWAYS deleted before responding, preventing replay attacks
    regardless of whether verification succeeds or fails.
    """
    logger.info("Verification started for session_id=%s", payload.session_id)

    # Validate response range
    validate_response(payload.response_s)

    # Consume session — single-use, deleted here whether valid or expired
    session = get_and_consume_session(payload.session_id)
    if session is None:
        raise HTTPException(
            status_code=400,
            detail="Session not found or expired. Please restart the login flow.",
        )

    logger.info("Verification started for username='%s'", session.username)

    # Load user's public key from the database
    db = get_db()
    user = await db["users"].find_one({"username": session.username})
    if user is None:
        # Extremely unlikely (user deleted between commit and verify)
        logger.error(
            "User '%s' disappeared between commit and verify.", session.username
        )
        raise HTTPException(status_code=404, detail="User not found.")

    public_key_y = int(user["public_key_y"]) # FIX: Cast the string back to an integer for math!

    # Run the Schnorr verification: G^s == r · y^e (mod P)
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
        # FIX: Raise an HTTPException so CORS middleware executes normally
        raise HTTPException(
            status_code=401,
            detail="Zero-knowledge proof failed."
        )