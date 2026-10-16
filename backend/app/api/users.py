from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditEvent, User
from app.schemas.api import UserCreate, UserOut, UserUpdate
from app.security.authentication import hash_password
from app.security.permissions import admin_only

router = APIRouter(prefix="/users", tags=["Usuarios"])


def _public_user(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
        "active": user.active,
        "municipality": user.municipality,
    }


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    return db.query(User).order_by(User.full_name, User.id).all()


@router.post("", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    user = User(
        username=data.username,
        full_name=data.full_name.strip(),
        password_hash=hash_password(data.password),
        role=data.role,
        active=data.active,
        municipality=data.municipality,
    )
    try:
        db.add(user)
        db.flush()
        db.add(AuditEvent(
            actor_id=actor.id,
            entity_type="user",
            entity_id=str(user.id),
            action="created",
            before_value=None,
            after_value=_public_user(user),
        ))
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Ya existe una cuenta con ese correo")


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")

    updates = data.model_dump(exclude_unset=True)
    before = _public_user(user)
    next_role = updates.get("role", user.role)
    next_active = updates.get("active", user.active)
    if user.id == actor.id and (not next_active or next_role != "admin"):
        raise HTTPException(409, "No puedes desactivar ni quitar el rol administrador de tu propia cuenta")
    if user.active and user.role == "admin" and (not next_active or next_role != "admin"):
        active_admins = db.query(User).filter_by(role="admin", active=True).count()
        if active_admins <= 1:
            raise HTTPException(409, "Debe permanecer al menos un administrador activo")

    password = updates.pop("password", None)
    try:
        for field, value in updates.items():
            setattr(user, field, value.strip() if field == "full_name" else value)
        if password:
            user.password_hash = hash_password(password)
        after = _public_user(user)
        db.add(AuditEvent(
            actor_id=actor.id,
            entity_type="user",
            entity_id=str(user.id),
            action="updated",
            before_value=before,
            after_value=after,
        ))
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Ya existe una cuenta con ese correo")
