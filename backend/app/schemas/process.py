"""
Schemas: Process + ProcessStep.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── ProcessStep ─────────────────────────────────────────
class StepBase(BaseModel):
    title: str
    description: Optional[str] = None
    is_completed: bool = False
    order: int = 0


class StepCreate(StepBase):
    pass


class StepUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None
    order: Optional[int] = None


class StepResponse(StepBase):
    id: int
    process_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Process ─────────────────────────────────────────────
class ProcessBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#6366f1"


class ProcessCreate(ProcessBase):
    pass


class ProcessUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class ProcessResponse(ProcessBase):
    id: int
    created_at: datetime
    updated_at: datetime
    steps: List[StepResponse] = []

    class Config:
        from_attributes = True


class ProcessListResponse(ProcessBase):
    """Lightweight response without steps for list view."""
    id: int
    created_at: datetime
    updated_at: datetime
    step_count: int = 0
    completed_count: int = 0

    class Config:
        from_attributes = True
