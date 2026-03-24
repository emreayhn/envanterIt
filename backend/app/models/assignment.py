"""
Assignment (zimmet) model — links any inventory item (computer, kiosk, printer,
or dynamic category item) to an employee.
"""

from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Exactly one of these four FKs will be set per row
    computer_id = Column(Integer, ForeignKey("computers.id"), nullable=True)
    kiosk_id    = Column(Integer, ForeignKey("kiosks.id"),    nullable=True)
    printer_id  = Column(Integer, ForeignKey("printers.id"),  nullable=True)
    item_id     = Column(Integer, ForeignKey("inventory_items.id"), nullable=True)

    license_id  = Column(Integer, ForeignKey("licenses.id"),  nullable=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    assigned_date = Column(Date, nullable=False)
    assigned_by   = Column(String(150), nullable=False, comment="IT staff who made the assignment")
    created_at    = Column(DateTime, server_default=func.now())
    returned_date = Column(Date, nullable=True, default=None)

    # Relationships
    computer = relationship("Computer",       backref="assignments", lazy="joined")
    kiosk    = relationship("Kiosk",          backref="assignments", lazy="joined")
    printer  = relationship("Printer",        backref="assignments", lazy="joined")
    item     = relationship("InventoryItem",  backref="assignments", lazy="joined")
    employee = relationship("Employee",       backref="assignments", lazy="joined")
    license  = relationship("License",        backref="assignments", lazy="joined")

    @property
    def item_type(self) -> str:
        if self.kiosk_id:   return "kiosk"
        if self.printer_id: return "printer"
        if self.item_id:    return "category_item"
        return "computer"
