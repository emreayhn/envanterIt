"""
LicenseAssignment model — tracks which employee has which license.
"""

from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class LicenseAssignment(Base):
    __tablename__ = "license_assignments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    license_id = Column(Integer, ForeignKey("licenses.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    assigned_date = Column(Date, nullable=False)
    assigned_by = Column(String(150), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    license = relationship("License", backref="license_assignments", lazy="joined")
    employee = relationship("Employee", backref="license_assignments", lazy="joined")
