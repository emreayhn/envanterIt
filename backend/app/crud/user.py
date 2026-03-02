"""
User CRUD operations.
"""

from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.models.user import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, full_name: str, email: str, password: str,
                role: UserRole = UserRole.USER, is_approved: bool = False) -> User:
    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        is_approved=is_approved,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_pending_users(db: Session) -> list[User]:
    return db.query(User).filter(User.is_approved == False).all()


def approve_user(db: Session, user_id: int) -> User | None:
    user = get_user_by_id(db, user_id)
    if user:
        user.is_approved = True
        db.commit()
        db.refresh(user)
    return user


def reject_user(db: Session, user_id: int) -> bool:
    user = get_user_by_id(db, user_id)
    if user:
        db.delete(user)
        db.commit()
        return True
    return False


def get_all_users(db: Session) -> list[User]:
    return db.query(User).all()


def seed_admin(db: Session):
    """Create default admin if no admin exists."""
    existing = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not existing:
        create_user(
            db,
            full_name="Admin",
            email="admin@envanter.local",
            password="admin123",
            role=UserRole.ADMIN,
            is_approved=True,
        )
