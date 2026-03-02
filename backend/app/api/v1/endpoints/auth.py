"""
Authentication API endpoints — register, login, user management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, require_admin, CurrentUser
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse
from app.crud import user as user_crud
from app.crud.user import hash_password, verify_password
from app.api.v1.endpoints.websocket import broadcast
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


class ResetPassword(BaseModel):
    new_password: str


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    existing = user_crud.get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu e-posta adresi zaten kayıtlı",
        )
    user = user_crud.create_user(db, data.full_name, data.email, data.password)
    broadcast({"type": "PENDING_USER", "user": data.full_name})
    return user


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = user_crud.get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı",
        )
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesabınız henüz onaylanmadı. Lütfen admin onayını bekleyin.",
        )
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role.value})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    user = user_crud.get_user_by_email(db, current.email)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return user


@router.get("/pending", response_model=list[UserResponse])
def get_pending(
    current: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return user_crud.get_pending_users(db)


@router.put("/approve/{user_id}", response_model=UserResponse)
def approve_user(
    user_id: int,
    current: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = user_crud.approve_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return user


@router.delete("/reject/{user_id}")
def reject_user(
    user_id: int,
    current: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    success = user_crud.reject_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return {"detail": "Kullanıcı reddedildi"}


@router.get("/users", response_model=list[UserResponse])
def list_users(
    current: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return user_crud.get_all_users(db)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: onaylanmış kullanıcıyı sil."""
    user = user_crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if user.id == current.id:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı silemezsiniz")
    db.delete(user)
    db.commit()
    return {"detail": "Kullanıcı silindi"}


@router.put("/change-password")
def change_password(
    data: ChangePassword,
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Kendi şifresini değiştir (mevcut şifreyi doğrulayarak)."""
    user = user_crud.get_user_by_id(db, current.id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mevcut şifre hatalı")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"detail": "Şifre başarıyla değiştirildi"}


@router.put("/reset-password/{user_id}")
def reset_password(
    user_id: int,
    data: ResetPassword,
    current: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: başka bir kullanıcının şifresini sıfırla."""
    user = user_crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"detail": f"{user.full_name} şifresi sıfırlandı"}
