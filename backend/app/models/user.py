"""
User model — authentication & authorization.
"""

import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, func

from app.core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    is_approved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
