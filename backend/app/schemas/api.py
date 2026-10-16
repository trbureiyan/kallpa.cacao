from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class Login(BaseModel):
    username: str
    password: str


MUNICIPALITIES = {"Rivera", "Campoalegre", "Algeciras"}


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["operator", "admin"]
    municipality: str | None = Field(default=None, max_length=80)
    active: bool = True

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("Ingrese un correo válido")
        return normalized

    @field_validator("municipality")
    @classmethod
    def validate_municipality(cls, value: str | None) -> str | None:
        if value is not None and value not in MUNICIPALITIES:
            raise ValueError("Municipio fuera del catálogo del proyecto")
        return value


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=80)
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: Literal["operator", "admin"] | None = None
    municipality: str | None = Field(default=None, max_length=80)
    active: bool | None = None

    @model_validator(mode="after")
    def sin_nulos_en_campos_obligatorios(self):
        # solo municipality admite null (quita la asignación); password en null se ignora como si no se enviara
        for campo in ("username", "full_name", "role", "active"):
            if campo in self.model_fields_set and getattr(self, campo) is None:
                raise ValueError(f"{campo} no puede ser null; omita el campo si no quiere cambiarlo")
        return self

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip().lower()
        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("Ingrese un correo válido")
        return normalized

    @field_validator("municipality")
    @classmethod
    def validate_municipality(cls, value: str | None) -> str | None:
        if value is not None and value not in MUNICIPALITIES:
            raise ValueError("Municipio fuera del catálogo del proyecto")
        return value


class UserOut(ORMModel):
    id: int
    username: str
    full_name: str
    role: str
    active: bool
    municipality: str | None


class ProducerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    code: str = Field(min_length=2, max_length=40)


class FarmCreate(BaseModel):
    producer_id: int
    name: str = Field(min_length=2, max_length=160)
    region: str = Field(min_length=2, max_length=160)


class ReceptionCreate(BaseModel):
    idempotency_key: UUID
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
    product_type: str
    origin: str
    received_on: date
    received_quantity: float
    unit: str
    available_quantity: float
    consumed_quantity: float
    status: str
    status_reason: str | None


class TransformationOutputCreate(BaseModel):
    lot_code: str = Field(min_length=2, max_length=40)
    product_type: str = Field(min_length=2, max_length=40)
    quantity: float = Field(gt=0)
    unit: str = Field(default="kg", min_length=1, max_length=20)


class TransformationCreate(BaseModel):
    idempotency_key: str = Field(min_length=8, max_length=100)
    lot_id: int
    stage: str = Field(min_length=2, max_length=120)
    occurred_at: datetime
    input_quantity: float = Field(gt=0)
    output_quantity: float | None = Field(default=None, ge=0)
    unit: str = "kg"
    incident: str | None = None
    output_code: str | None = Field(default=None, min_length=2, max_length=40)
    product_type: str = Field(default="processed_cocoa", min_length=2, max_length=40)
    outputs: list[TransformationOutputCreate] | None = Field(default=None, min_length=1, max_length=20)
    costs_cop: float | None = Field(default=None, ge=0)  # None = la etapa no registró costo
    sale_price_cop_per_unit: float | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def normalize_outputs(self):
        if self.outputs:
            codes = [output.lot_code for output in self.outputs]
            if len(codes) != len(set(codes)):
                raise ValueError("Cada lote de salida debe tener un código único")
            if self.output_code and self.output_code != codes[0]:
                raise ValueError("output_code debe coincidir con el código de la primera salida")
            self.output_quantity = sum(output.quantity for output in self.outputs)
            self.output_code = codes[0]
        elif self.output_quantity is None or self.output_code is None:
            raise ValueError("Indique output_code y output_quantity, o la lista outputs")
        return self


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
    product_type: str
    stage: str
    occurred_at: datetime
    output_quantity: float
    unit: str
    status: str
    availability: str
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
