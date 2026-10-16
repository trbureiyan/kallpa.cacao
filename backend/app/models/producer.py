from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Producer(Base):
    __tablename__ = "producers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    contact: Mapped[str | None] = mapped_column(String(160), nullable=True)
