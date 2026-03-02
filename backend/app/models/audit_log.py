"""
Audit log model — every CUD operation is tracked here.
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, func
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    action = Column(String(50), nullable=False, comment="CREATE / UPDATE / DELETE")
    user_email = Column(String(150), nullable=False)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    details = Column(Text, nullable=True)
