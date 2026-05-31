"""
schemas/auth.py — Pydantic v2 request/response models for authentication endpoints.
"""

from pydantic import BaseModel, Field


# ── POST /api/auth/commit ──────────────────────────────────────────────────────

class CommitRequest(BaseModel):
    """
    Step 1 of the Schnorr handshake.
    The prover sends r = G^k mod P as their commitment.
    """
    username: str = Field(..., description="Registered username")
    commitment_r: int = Field(..., description="Commitment r = G^k mod P", gt=0)


class CommitResponse(BaseModel):
    """
    Server responds with a unique session ID and a random challenge e.
    The session ID ties the commitment to the subsequent verify call.
    """
    session_id: str = Field(..., description="Unique challenge session identifier")
    challenge_e: int = Field(..., description="Random challenge e ∈ (1, Q)")


# ── POST /api/auth/verify ──────────────────────────────────────────────────────

class VerifyRequest(BaseModel):
    """
    Step 2 of the Schnorr handshake.
    The prover sends s = (k + e·x) mod Q.
    """
    session_id: str = Field(..., description="Session ID from commit response")
    response_s: int = Field(..., description="Response s = (k + e·x) mod Q", ge=0)


class VerifyResponse(BaseModel):
    """Verification outcome."""
    authenticated: bool
    token: str | None = None
    message: str | None = None