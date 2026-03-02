"""
Employees API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.crud import employee as employee_crud
from app.crud.audit_log import create_audit_log
from app.models.assignment import Assignment
from app.models.license_assignment import LicenseAssignment

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("/", response_model=list[EmployeeResponse])
def list_employees(
    skip: int = 0,
    limit: int = 100,
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

    return {
        "employee_name": emp.full_name,
        "affected_computers": affected_computers,
    }
