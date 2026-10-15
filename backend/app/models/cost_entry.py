from decimal import Decimal
from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CostEntry(Base):
    __tablename__ = "cost_entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"), index=True)
    reception_id: Mapped[int | None] = mapped_column(ForeignKey("receptions.id"), nullable=True)
    transformation_id: Mapped[int | None] = mapped_column(ForeignKey("transformations.id"), nullable=True)
    category: Mapped[str] = mapped_column(String(40))
    amount_cop: Mapped[Decimal] = mapped_column(Numeric(16, 2))
