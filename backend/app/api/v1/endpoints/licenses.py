"""
Licenses API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.schemas.license import LicenseCreate, LicenseUpdate, LicenseResponse
from app.crud import license as license_crud
from app.crud.audit_log import create_audit_log

router = APIRouter(prefix="/licenses", tags=["Licenses"])


@router.get("/", response_model=list[LicenseResponse])
def list_licenses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return license_crud.get_licenses(db, skip=skip, limit=limit)


@router.post("/", response_model=LicenseResponse, status_code=201)
def create_license(
    data: LicenseCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = license_crud.create_license(db, data)
    create_audit_log(
        db,
        action="CREATE_LICENSE",
        user_email=user.email,
        details=f"Created license for {obj.software_name}",
    )
    return obj


@router.put("/{license_id}", response_model=LicenseResponse)
def update_license(
    license_id: int,
    data: LicenseUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = license_crud.update_license(db, license_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="License not found")
    create_audit_log(
        db,
        action="UPDATE_LICENSE",
        user_email=user.email,
        details=f"Updated license id={license_id}",
    )
    return obj


@router.delete("/{license_id}", status_code=204)
def delete_license(
    license_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    lic = license_crud.get_license(db, license_id)
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")
    create_audit_log(
        db,
        action="DELETE_LICENSE",
        user_email=user.email,
        details=f"Deleted license {lic.software_name} ({lic.license_key})",
    )
    license_crud.delete_license(db, license_id)
