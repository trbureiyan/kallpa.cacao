from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Transformation(Base):
    __tablename__ = "transformations"
    id: Mapped[int] = mapped_column(primary_key=True)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"), index=True)
    stage: Mapped[str] = mapped_column(String(120))
    responsible_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    input_quantity: Mapped[float] = mapped_column(Numeric(14, 3))
    output_quantity: Mapped[float] = mapped_column(Numeric(14, 3))
    unit: Mapped[str] = mapped_column(String(20))
    incident: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    costs_cop: Mapped[float] = mapped_column(Numeric(16, 2), default=0)
    sale_price_cop_per_unit: Mapped[float | None] = mapped_column(Numeric(16, 2), nullable=True)
    output_status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    status_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
