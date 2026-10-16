from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Reception(Base):
    __tablename__ = "receptions"
    id: Mapped[int] = mapped_column(primary_key=True)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"), unique=True, index=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"), index=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    quantity_kg: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    purchase_total_cop: Mapped[Decimal] = mapped_column(Numeric(16, 2))
    quality_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
