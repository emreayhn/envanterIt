"""
API Endpoints: /api/v1/processes — Süreç yönetimi.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.process import (
    ProcessCreate, ProcessUpdate, ProcessResponse, ProcessListResponse,
    StepCreate, StepUpdate, StepResponse,
)
from app.crud import process as crud

router = APIRouter(prefix="/processes", tags=["processes"])


# ── Process endpoints ───────────────────────────────────
@router.get("", response_model=List[ProcessListResponse])
def list_processes(db: Session = Depends(get_db)):
    processes = crud.get_processes(db)
    results = []
    for p in processes:
        steps = p.steps or []
        results.append(ProcessListResponse(
            id=p.id, name=p.name, description=p.description,
            color=p.color, created_at=p.created_at, updated_at=p.updated_at,
            step_count=len(steps),
            completed_count=sum(1 for s in steps if s.is_completed),
        ))
    return results


@router.get("/{process_id}", response_model=ProcessResponse)
def get_process(process_id: int, db: Session = Depends(get_db)):
    p = crud.get_process(db, process_id)
    if not p:
        raise HTTPException(404, "Süreç bulunamadı")
    return p


@router.post("", response_model=ProcessResponse, status_code=201)
def create_process(data: ProcessCreate, db: Session = Depends(get_db)):
    return crud.create_process(db, data.model_dump())


@router.put("/{process_id}", response_model=ProcessResponse)
def update_process(process_id: int, data: ProcessUpdate, db: Session = Depends(get_db)):
    p = crud.update_process(db, process_id, data.model_dump(exclude_unset=True))
    if not p:
        raise HTTPException(404, "Süreç bulunamadı")
    return p


@router.delete("/{process_id}")
def delete_process(process_id: int, db: Session = Depends(get_db)):
    if not crud.delete_process(db, process_id):
        raise HTTPException(404, "Süreç bulunamadı")
    return {"ok": True}


# ── Step endpoints ──────────────────────────────────────
@router.get("/{process_id}/steps", response_model=List[StepResponse])
def list_steps(process_id: int, db: Session = Depends(get_db)):
    p = crud.get_process(db, process_id)
    if not p:
        raise HTTPException(404, "Süreç bulunamadı")
    return crud.get_steps(db, process_id)


@router.post("/{process_id}/steps", response_model=StepResponse, status_code=201)
def create_step(process_id: int, data: StepCreate, db: Session = Depends(get_db)):
    p = crud.get_process(db, process_id)
    if not p:
        raise HTTPException(404, "Süreç bulunamadı")
    return crud.create_step(db, process_id, data.model_dump())


@router.put("/steps/{step_id}", response_model=StepResponse)
def update_step(step_id: int, data: StepUpdate, db: Session = Depends(get_db)):
    s = crud.update_step(db, step_id, data.model_dump(exclude_unset=True))
    if not s:
        raise HTTPException(404, "Adım bulunamadı")
    return s


@router.delete("/steps/{step_id}")
def delete_step(step_id: int, db: Session = Depends(get_db)):
    if not crud.delete_step(db, step_id):
        raise HTTPException(404, "Adım bulunamadı")
    return {"ok": True}


@router.put("/{process_id}/steps/reorder")
def reorder_steps(process_id: int, step_ids: List[int], db: Session = Depends(get_db)):
    crud.reorder_steps(db, process_id, step_ids)
    return {"ok": True}
