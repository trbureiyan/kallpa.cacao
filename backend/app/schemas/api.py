from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class Login(BaseModel):
    username: str
    password: str


class ProducerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    code: str = Field(min_length=2, max_length=40)


class FarmCreate(BaseModel):
    producer_id: int
    name: str = Field(min_length=2, max_length=160)
    region: str = Field(min_length=2, max_length=160)


class ReceptionCreate(BaseModel):
    idempotency_key: str = Field(min_length=8, max_length=100)
    lot_code: str = Field(min_length=2, max_length=40)
    farm_id: int
    received_at: datetime
    quantity_kg: Decimal = Field(gt=0, max_digits=14, decimal_places=3)
    purchase_total_cop: Decimal = Field(ge=0, max_digits=16, decimal_places=2)
    quality_notes: str | None = None


class ReceptionOut(BaseModel):
    reception_id: int
    lot_id: int
    lot_code: str
    farm_id: int
    received_at: datetime
    quantity_kg: Decimal
    unit: str = "kg"
    available_quantity_kg: Decimal
    purchase_total_cop: Decimal


class LotCreate(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    producer_id: int
    origin: str = Field(min_length=2, max_length=160)
    received_on: date
    received_quantity: float = Field(gt=0)
    unit: str = Field(default="kg", min_length=1, max_length=20)


class LotOut(ORMModel):
    id: int
    code: str
    producer_id: int
    origin: str
    received_on: date
    received_quantity: float
    unit: str
    available_quantity: float
    consumed_quantity: float
    status: str
    status_reason: str | None


class TransformationCreate(BaseModel):
    idempotency_key: str = Field(min_length=8, max_length=100)
    lot_id: int
    stage: str = Field(min_length=2, max_length=120)
    occurred_at: datetime
    input_quantity: float = Field(gt=0)
    output_quantity: float = Field(ge=0)
    unit: str = "kg"
    incident: str | None = None
    output_code: str = Field(min_length=2, max_length=50)
    costs_cop: float = Field(default=0, ge=0)
    sale_price_cop_per_unit: float | None = Field(default=None, ge=0)


class StatusChange(BaseModel):
    status: str
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("status")
    @classmethod
    def valid_status(cls, value):
        if value not in {"pending", "released", "blocked"}:
            raise ValueError("Estado debe ser pending, released o blocked")
        return value


class PublicProduct(BaseModel):
    code: str
    stage: str
    occurred_at: datetime
    output_quantity: float
    unit: str
    status: str
    status_reason: str | None
    origin: str
    received_on: date


class CostSummary(BaseModel):
    transformation_id: int
    output_quantity: float
    unit: str
    total_cost_cop: float
    unit_cost_cop: float | None
    sale_price_cop_per_unit: float | None
    margin_on_sale_percent: float | None
    formula: str
    included_costs: list[str]
