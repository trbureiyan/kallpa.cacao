from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class FinanceRecord(Base):
    __tablename__ = "finance_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    transformation_id: Mapped[int] = mapped_column(ForeignKey("transformations.id"), unique=True)
    total_cost_cop: Mapped[float] = mapped_column(Numeric(16, 2))
    sale_price_cop_per_unit: Mapped[float | None] = mapped_column(Numeric(16, 2), nullable=True)
