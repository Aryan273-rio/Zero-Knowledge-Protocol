"""
schemas/auth.py — Authentication request/response models.

commitment_r and response_s are accepted as int or str for the same
reason as public_key_y — the JS frontend sends large BigInts as
decimal strings to avoid JSON integer precision loss above 2^53.
"""

from pydantic import BaseModel, Field, field_validator


# ── POST /api/auth/commit ─────────────────────────────────────

class CommitRequest(BaseModel):
    username: str = Field(..., description="Registered username")
    commitment_r: int = Field(..., description="Commitment r = G^k mod P")

    @field_validator("commitment_r", mode="before")
    @classmethod
    def coerce_commitment(cls, v) -> int:
        """Accept decimal string or int."""
        try:
            return int(v)
        except (ValueError, TypeError):
            raise ValueError("commitment_r must be a valid integer or decimal string.")


class CommitResponse(BaseModel):
    session_id: str = Field(..., description="Unique challenge session identifier")
    challenge_e: str = Field(..., description="Random challenge e ∈ (1, Q)")  # FIX: Change 'int' to 'str'


# ── POST /api/auth/verify ─────────────────────────────────────

class VerifyRequest(BaseModel):
    session_id: str = Field(..., description="Session ID from commit response")
    response_s: int = Field(..., description="Response s = (k + e·x) mod Q")

    @field_validator("response_s", mode="before")
    @classmethod
    def coerce_response(cls, v) -> int:
        """Accept decimal string or int."""
        try:
            return int(v)
        except (ValueError, TypeError):
            raise ValueError("response_s must be a valid integer or decimal string.")


class VerifyResponse(BaseModel):
    authenticated: bool
    token: str | None = None
    message: str | None = None