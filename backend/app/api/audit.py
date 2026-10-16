from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditEvent, User
from app.security.permissions import admin_only

router = APIRouter(prefix="/audit", tags=["Auditoría"])


@router.get("")
def list_audit_events(db: Session = Depends(get_db), _actor: User = Depends(admin_only)):
    rows = (
        db.query(AuditEvent, User)
        .join(User, AuditEvent.actor_id == User.id)
        .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        .all()
    )
    return [
        {
            "id": event.id,
            "actor_id": event.actor_id,
            "actor_name": user.full_name,
            "actor_username": user.username,
            "entity_type": event.entity_type,
            "entity_id": event.entity_id,
            "action": event.action,
            "before_value": event.before_value,
            "after_value": event.after_value,
            "created_at": event.created_at,
        }
        for event, user in rows
    ]
