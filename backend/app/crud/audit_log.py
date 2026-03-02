"""
CRUD operations for the AuditLog.
"""

from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


def create_audit_log(db: Session, action: str, user_email: str, details: str | None = None):
    log = AuditLog(action=action, user_email=user_email, details=details)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_audit_logs(db: Session, skip: int = 0, limit: int = 50):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
