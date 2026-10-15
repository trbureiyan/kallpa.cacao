from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models import AuditEvent, FinanceRecord, InventoryMovement, Lot, Transformation, User


def create_transformation(db: Session, data, actor: User):
    previous = db.query(Transformation).filter_by(idempotency_key=data.idempotency_key).first()
    if previous:
        return previous
    # Lock the inventory row on databases that support row-level locks (PostgreSQL).
    lot = db.query(Lot).filter(Lot.id == data.lot_id).with_for_update().first()
    if not lot:
        raise HTTPException(404, "Lote no encontrado")
    if data.unit != lot.unit:
        raise HTTPException(422, "La unidad de la transformación debe coincidir con la del lote")
    if data.input_quantity > float(lot.available_quantity):
        raise HTTPException(409, f"Existencia insuficiente: disponible {lot.available_quantity} {lot.unit}")
    if data.output_quantity > data.input_quantity and not data.incident:
        raise HTTPException(422, "Una salida mayor que la entrada requiere justificar la adición en incidencias")
    transform = Transformation(**data.model_dump(), responsible_id=actor.id)
    try:
        db.add(transform)
        db.flush()
        before = {"available_quantity": float(lot.available_quantity), "consumed_quantity": float(lot.consumed_quantity)}
        lot.available_quantity = float(lot.available_quantity) - data.input_quantity
        lot.consumed_quantity = float(lot.consumed_quantity) + data.input_quantity
        db.add(InventoryMovement(lot_id=lot.id, transformation_id=transform.id, movement_type="consumption", quantity=data.input_quantity, unit=lot.unit))
        db.add(FinanceRecord(transformation_id=transform.id, total_cost_cop=data.costs_cop, sale_price_cop_per_unit=data.sale_price_cop_per_unit))
        db.add(AuditEvent(actor_id=actor.id, entity_type="lot", entity_id=str(lot.id), action="inventory_consumed", before_value=before,
                          after_value={"available_quantity": float(lot.available_quantity), "consumed_quantity": float(lot.consumed_quantity), "transformation_id": transform.id,
                                       "stage": transform.stage, "input_quantity": data.input_quantity, "output_quantity": data.output_quantity,
                                       "output_code": transform.output_code, "incident": data.incident}))
        db.commit()
        db.refresh(transform)
        return transform
    except IntegrityError:
        db.rollback()
        previous = db.query(Transformation).filter_by(idempotency_key=data.idempotency_key).first()
        if previous:
            return previous
        raise HTTPException(409, "La operación duplica una clave o un código de salida")
    except Exception:
        db.rollback()
        raise
