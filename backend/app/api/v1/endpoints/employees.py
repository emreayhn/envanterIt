"""
Employees API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeQuickCreate
from app.crud import employee as employee_crud
from app.crud.audit_log import create_audit_log
from app.models.assignment import Assignment
from app.models.license_assignment import LicenseAssignment
from app.api.v1.endpoints.websocket import broadcast

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("/", response_model=list[EmployeeResponse])
def list_employees(
    skip: int = 0,
    limit: int = 2000,
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return employee_crud.get_employees(db, skip=skip, limit=limit, search=search)


@router.post("/", response_model=EmployeeResponse, status_code=201)
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = employee_crud.create_employee(db, data)
    create_audit_log(
        db,
        action="CREATE_EMPLOYEE",
        user_email=user.email,
        details=f"Created employee {obj.full_name} ({obj.email})",
    )
    broadcast({"type": "REFRESH", "entity": "employees"})
    return obj


@router.post("/quick", response_model=EmployeeResponse, status_code=201)
def create_employee_quick(
    data: EmployeeQuickCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = employee_crud.create_employee_quick(db, data.full_name)
    create_audit_log(
        db,
        action="CREATE_EMPLOYEE_QUICK",
        user_email=user.email,
        details=f"Quick created employee {obj.full_name}",
    )
    broadcast({"type": "REFRESH", "entity": "employees"})
    return obj


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = employee_crud.update_employee(db, employee_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Employee not found")
    create_audit_log(
        db,
        action="UPDATE_EMPLOYEE",
        user_email=user.email,
        details=f"Updated employee id={employee_id}",
    )
    broadcast({"type": "REFRESH", "entity": "employees"})
    return obj


@router.delete("/{employee_id}")
def delete_employee_endpoint(
    employee_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    from app.models.computer import Computer, ComputerStatus

    emp = db.query(employee_crud.Employee).filter(employee_crud.Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Find computers assigned to this employee and reset them to STOCK
    related_assignments = db.query(Assignment).filter(Assignment.employee_id == employee_id).all()
    affected_computers = []
    for a in related_assignments:
        pc = db.query(Computer).filter(Computer.id == a.computer_id).first()
        if pc and pc.status == ComputerStatus.ASSIGNED:
            pc.status = ComputerStatus.STOCK
            affected_computers.append(f"{pc.brand} {pc.model} ({pc.serial_no})")

    create_audit_log(
        db,
        action="DELETE_EMPLOYEE",
        user_email=user.email,
        details=f"Deleted employee {emp.full_name} ({emp.email}). Computers returned to STOCK: {affected_computers}",
    )

    # Remove related records
    db.query(Assignment).filter(Assignment.employee_id == employee_id).delete()
    db.query(LicenseAssignment).filter(LicenseAssignment.employee_id == employee_id).delete()
    db.delete(emp)
    db.commit()
    broadcast({"type": "REFRESH", "entity": "employees"})

    return {
        "employee_name": emp.full_name,
        "affected_computers": affected_computers,
    }


@router.delete("/bulk/unassigned")
def delete_unassigned_employees(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Silme: Üzerinde aktif bilgisayar zimmeti OLMAYAN tüm personelleri siler."""
    
    # 1. Aktif zimmeti olan personel ID'lerini bul
    active_assignments = db.query(Assignment.employee_id).filter(Assignment.returned_date == None).distinct().all()
    active_employee_ids = [a[0] for a in active_assignments]
    
    # 2. Aktif zimmeti olmayan personelleri bul
    query = db.query(employee_crud.Employee)
    if active_employee_ids:
        query = query.filter(employee_crud.Employee.id.notin_(active_employee_ids))
    
    unassigned_employees = query.all()
    count = len(unassigned_employees)
    
    if count == 0:
        return {"deleted_count": 0, "message": "Silinecek personel bulunamadı (Tüm personellerin aktif zimmeti var)."}

    unassigned_ids = [e.id for e in unassigned_employees]

    # 3. İlgili geçmiş kayıtlarını temizle
    db.query(Assignment).filter(Assignment.employee_id.in_(unassigned_ids)).delete(synchronize_session=False)
    db.query(LicenseAssignment).filter(LicenseAssignment.employee_id.in_(unassigned_ids)).delete(synchronize_session=False)

    # 4. Personelleri sil
    db.query(employee_crud.Employee).filter(employee_crud.Employee.id.in_(unassigned_ids)).delete(synchronize_session=False)
    
    # 5. Commit ve Log
    create_audit_log(
        db,
        action="BULK_DELETE_UNASSIGNED_EMPLOYEES",
        user_email=user.email,
        details=f"Toplu silme: Aktif zimmeti olmayan {count} personel silindi.",
    )
    db.commit()
    broadcast({"type": "REFRESH", "entity": "employees"})

    return {
        "deleted_count": count,
        "message": f"{count} adet atanmamış personel başarıyla silindi.",
    }



@router.post("/bulk", status_code=201)
def bulk_create_employees(
    items: list[EmployeeCreate],
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """CSV'den toplu personel oluştur. Email zaten varsa atla."""
    created_count = 0
    skipped_count = 0
    skipped_emails = []

    for item in items:
        existing = db.query(employee_crud.Employee).filter(
            employee_crud.Employee.email == item.email
        ).first()
        if existing:
            skipped_count += 1
            skipped_emails.append(item.email)
            continue
        employee_crud.create_employee(db, item)
        created_count += 1

    broadcast({"type": "REFRESH", "entity": "employees"})
    return {
        "created_count": created_count,
        "skipped_count": skipped_count,
        "skipped_emails": skipped_emails,
    }
