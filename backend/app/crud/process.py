"""
CRUD: Process + ProcessStep.
"""
from sqlalchemy.orm import Session
from app.models.process import Process, ProcessStep


# ── Process ─────────────────────────────────────────────
def get_processes(db: Session):
    return db.query(Process).order_by(Process.updated_at.desc()).all()


def get_process(db: Session, process_id: int):
    return db.query(Process).filter(Process.id == process_id).first()


def create_process(db: Session, data: dict):
    process = Process(**data)
    db.add(process)
    db.commit()
    db.refresh(process)
    return process


def update_process(db: Session, process_id: int, data: dict):
    process = db.query(Process).filter(Process.id == process_id).first()
    if not process:
        return None
    for k, v in data.items():
        if v is not None:
            setattr(process, k, v)
    db.commit()
    db.refresh(process)
    return process


def delete_process(db: Session, process_id: int):
    process = db.query(Process).filter(Process.id == process_id).first()
    if not process:
        return False
    db.delete(process)
    db.commit()
    return True


# ── ProcessStep ─────────────────────────────────────────
def get_steps(db: Session, process_id: int):
    return db.query(ProcessStep).filter(
        ProcessStep.process_id == process_id
    ).order_by(ProcessStep.order, ProcessStep.id).all()


def get_step(db: Session, step_id: int):
    return db.query(ProcessStep).filter(ProcessStep.id == step_id).first()


def create_step(db: Session, process_id: int, data: dict):
    # Auto-set order to last
    max_order = db.query(ProcessStep).filter(
        ProcessStep.process_id == process_id
    ).count()
    data.pop("order", None)  # remove order from data, we set it explicitly
    data.pop("is_completed", None)  # new steps are never completed
    step = ProcessStep(process_id=process_id, order=max_order, **data)
    db.add(step)
    db.commit()
    db.refresh(step)
    return step


def update_step(db: Session, step_id: int, data: dict):
    step = db.query(ProcessStep).filter(ProcessStep.id == step_id).first()
    if not step:
        return None
    for k, v in data.items():
        if v is not None:
            setattr(step, k, v)
    db.commit()
    db.refresh(step)
    return step


def delete_step(db: Session, step_id: int):
    step = db.query(ProcessStep).filter(ProcessStep.id == step_id).first()
    if not step:
        return False
    db.delete(step)
    db.commit()
    return True


def reorder_steps(db: Session, process_id: int, step_ids: list):
    """Reorder steps by list of IDs."""
    for idx, sid in enumerate(step_ids):
        step = db.query(ProcessStep).filter(
            ProcessStep.id == sid,
            ProcessStep.process_id == process_id
        ).first()
        if step:
            step.order = idx
    db.commit()
