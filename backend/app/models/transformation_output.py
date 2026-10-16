from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TransformationOutput(Base):
    """Explicit link between a transformation and each processed output lot."""

    __tablename__ = "transformation_outputs"
    __table_args__ = (UniqueConstraint("transformation_id", "lot_id", name="uq_transformation_output_lot"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    transformation_id: Mapped[int] = mapped_column(ForeignKey("transformations.id", ondelete="RESTRICT"), index=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id", ondelete="RESTRICT"), unique=True, index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3))
