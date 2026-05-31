from pydantic import BaseModel, field_validator
import re

USERNAME_RE = re.compile(r'^[a-zA-Z0-9_-]{3,50}$')


class RegisterRequest(BaseModel):
    username: str
    public_key_y: int

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not USERNAME_RE.match(v):
            raise ValueError(
                "Username must be 3–50 characters and contain only "
                "letters, digits, underscores, or hyphens."
            )
        return v


class RegisterResponse(BaseModel):
    status: str = "success"
    message: str = "User registered successfully"