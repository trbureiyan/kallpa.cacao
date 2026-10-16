from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    id: Mapped[int] = mapped_column(primary_key=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"), index=True)
    transformation_id: Mapped[int | None] = mapped_column(ForeignKey("transformations.id"), nullable=True)
    reception_id: Mapped[int | None] = mapped_column(ForeignKey("receptions.id"), nullable=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    movement_type: Mapped[str] = mapped_column(String(20))
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    unit: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
