from datetime import timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuditEvent, CostEntry, Farm, InventoryMovement, Lot, Producer, Reception, User
from app.schemas.api import FarmCreate, ProducerCreate, ReceptionCreate, ReceptionOut
from app.security.permissions import operator_or_admin

router = APIRouter(tags=["Recepciones"])


@router.get("/farms")
def list_farms(db: Session = Depends(get_db), actor: User = Depends(operator_or_admin)):
    return db.query(Farm).order_by(Farm.region, Farm.name).all()


@router.post("/farms", status_code=201)
def create_farm(data: FarmCreate, db: Session = Depends(get_db), actor: User = Depends(operator_or_admin)):
    if not db.get(Producer, data.producer_id):
        raise HTTPException(404, "Productor no encontrado")
    farm = Farm(**data.model_dump())
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return {"id": farm.id, "producer_id": farm.producer_id, "name": farm.name, "region": farm.region}


def _reception_result(reception: Reception, lot: Lot):
    return {"reception_id": reception.id, "lot_id": lot.id, "lot_code": lot.code, "farm_id": reception.farm_id,
            "received_at": reception.received_at, "quantity_kg": reception.quantity_kg,
            "available_quantity_kg": lot.available_quantity, "purchase_total_cop": reception.purchase_total_cop}


def _same_reception(existing: Reception, data: ReceptionCreate) -> bool:
    persisted_time = existing.received_at
    if persisted_time.tzinfo is None:
        persisted_time = persisted_time.replace(tzinfo=timezone.utc)
    return (existing.lot_id is not None and existing.farm_id == data.farm_id
            and existing.quantity_kg == data.quantity_kg
            and existing.purchase_total_cop == data.purchase_total_cop
            and existing.quality_notes == data.quality_notes
            and persisted_time == data.received_at.astimezone(timezone.utc))


@router.post("/receptions", response_model=ReceptionOut, status_code=201)
def create_reception(data: ReceptionCreate, db: Session = Depends(get_db), actor: User = Depends(operator_or_admin)):
    existing = db.query(Reception).filter_by(idempotency_key=data.idempotency_key).first()
    if existing:
        lot = db.get(Lot, existing.lot_id)
        if not lot or lot.code != data.lot_code or not _same_reception(existing, data):
            raise HTTPException(409, "La clave de idempotencia ya fue usada con otra recepción")
        return _reception_result(existing, lot)

    farm = db.get(Farm, data.farm_id)
    if not farm:
        raise HTTPException(404, "Finca no encontrada")
    producer = db.get(Producer, farm.producer_id)
    occurred_at = data.received_at
    if occurred_at.tzinfo is None:
        raise HTTPException(422, "received_at debe incluir zona horaria, por ejemplo Z")

    try:
        lot = Lot(code=data.lot_code, producer_id=producer.id, farm_id=farm.id, origin=farm.region,
                  received_on=occurred_at.date(), received_quantity=data.quantity_kg, unit="kg",
                  available_quantity=data.quantity_kg, consumed_quantity=Decimal("0"), status="pending")
        db.add(lot)
        db.flush()
        reception = Reception(idempotency_key=data.idempotency_key, lot_id=lot.id, farm_id=farm.id,
                              received_at=occurred_at.astimezone(timezone.utc), quantity_kg=data.quantity_kg,
                              purchase_total_cop=data.purchase_total_cop, quality_notes=data.quality_notes)
        db.add(reception)
        db.flush()
        db.add(InventoryMovement(lot_id=lot.id, reception_id=reception.id, actor_id=actor.id,
                                 reference=f"reception:{reception.id}", movement_type="reception",
                                 quantity=data.quantity_kg, unit="kg"))
        db.add(CostEntry(lot_id=lot.id, reception_id=reception.id, category="purchase",
                         amount_cop=data.purchase_total_cop))
        db.add(AuditEvent(actor_id=actor.id, entity_type="lot", entity_id=str(lot.id), action="received",
                          before_value=None, after_value={"code": lot.code, "farm_id": farm.id,
                          "region": farm.region, "quantity_kg": str(data.quantity_kg),
                          "purchase_total_cop": str(data.purchase_total_cop)}))
        db.commit()
        db.refresh(reception)
        db.refresh(lot)
        return _reception_result(reception, lot)
    except IntegrityError:
        db.rollback()
        existing = db.query(Reception).filter_by(idempotency_key=data.idempotency_key).first()
        if existing:
            lot = db.get(Lot, existing.lot_id)
            if lot and lot.code == data.lot_code and _same_reception(existing, data):
                return _reception_result(existing, lot)
        raise HTTPException(409, "Código de lote duplicado o recepción conflictiva")
    except Exception:
        db.rollback()
        raise


@router.post("/producers", status_code=201)
def create_producer(data: ProducerCreate, db: Session = Depends(get_db), actor: User = Depends(operator_or_admin)):
    producer = Producer(**data.model_dump())
    db.add(producer)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(409, "El código de productor ya existe")
    db.refresh(producer)
    return {"id": producer.id, "code": producer.code, "name": producer.name}
