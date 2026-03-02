"""
User Pydantic schemas — request/response validation.
"""

from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    full_name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    is_approved: bool
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
