"""
Assignment (zimmet) model — links a computer (and optionally a license) to an employee.
"""

from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime, func, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    computer_id = Column(Integer, ForeignKey("computers.id"), nullable=False)
    license_id = Column(Integer, ForeignKey("licenses.id"), nullable=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    assigned_date = Column(Date, nullable=False)
    assigned_by = Column(String(150), nullable=False, comment="IT staff who made the assignment")
    created_at = Column(DateTime, server_default=func.now())
    returned_date = Column(Date, nullable=True, default=None)

    # Relationships (lazy-loaded)
    computer = relationship("Computer", backref="assignments", lazy="joined")
    employee = relationship("Employee", backref="assignments", lazy="joined")
    license = relationship("License", backref="assignments", lazy="joined")
