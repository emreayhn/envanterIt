"""
Pydantic schema for audit log responses.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: int
    action: str
    user_email: str
    timestamp: datetime
    details: Optional[str] = None

    class Config:
        from_attributes = True
