from datetime import datetime, timezone
from sqlalchemy import event
from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, Session, mapped_column
from app.database import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    entity_type: Mapped[str] = mapped_column(String(50), index=True)
    entity_id: Mapped[str] = mapped_column(String(80), index=True)
    action: Mapped[str] = mapped_column(String(50))
    before_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


@event.listens_for(Session, "before_flush")
def prevent_audit_mutation(session: Session, flush_context, instances) -> None:
    changed = any(
        isinstance(item, AuditEvent) and session.is_modified(item, include_collections=False)
        for item in session.dirty
    )
    removed = any(isinstance(item, AuditEvent) for item in session.deleted)
    if changed or removed:
        raise ValueError("Los eventos de auditoría son inmutables")
