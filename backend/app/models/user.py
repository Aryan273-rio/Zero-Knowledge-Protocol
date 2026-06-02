"""
schemas/user.py — Pydantic v2 request/response models for registration.
"""

from pydantic import BaseModel, Field, field_validator

# ── POST /api/register ─────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """
    Registration payload.
    The client sends ONLY the public key y = G^x mod P.
    The secret key x never leaves the client.
    """
    # Added min_length and max_length to actually enforce your 3-50 char rule!
    username: str = Field(
        ..., 
        min_length=3, 
        max_length=50, 
        description="Desired username (3–50 alphanumeric chars)"
    )
    
    # Removed the gt=1 constraint from the Field
    public_key_y: str = Field(
        ...,
        description="Public key y = G^x mod P (passed as string to prevent JSON integer overflow)"
    )

    # Use a validator to safely check the math value of the string
    @field_validator("public_key_y")
    @classmethod
    def validate_public_key(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("Public key must be a numeric string")
        
        # Now it is safe to convert and check the math
        if int(v) <= 1:
            raise ValueError("Public key must be greater than 1")
            
        return v


class RegisterResponse(BaseModel):
    """Successful registration response."""
    status: str = "success"
    message: str = "User registered successfully"