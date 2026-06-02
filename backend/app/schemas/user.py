"""
schemas/user.py — Registration request/response models.

public_key_y is accepted as either int or str to handle large BigInts
sent from the JavaScript frontend (JSON numbers lose precision above 2^53,
so the frontend sends them as decimal strings instead).
"""

from pydantic import BaseModel, field_validator
import re

USERNAME_RE = re.compile(r'^[a-zA-Z0-9_-]{3,50}$')


class RegisterRequest(BaseModel):
    username: str
    public_key_y: int  # Pydantic v2 coerces string → int automatically

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not USERNAME_RE.match(v):
            raise ValueError(
                "Username must be 3–50 characters and contain only "
                "letters, digits, underscores, or hyphens."
            )
        return v

    @field_validator("public_key_y", mode="before")
    @classmethod
    def coerce_public_key(cls, v) -> int:
        """Accept decimal string or int — JS sends large BigInts as strings."""
        try:
            return int(v)
        except (ValueError, TypeError):
            raise ValueError("public_key_y must be a valid integer or decimal string.")


class RegisterResponse(BaseModel):
    status: str = "success"
    message: str = "User registered successfully"