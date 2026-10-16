import hashlib
import json
from datetime import timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    AuditEvent,
    FinanceRecord,
    InventoryMovement,
    Lot,
    Transformation,
    TransformationOutput,
    User,
)


def _quantity(value) -> str:
    return format(Decimal(str(value)).quantize(Decimal("0.001")), ".3f")


def _money(value) -> str:
    return format(Decimal(str(value)).quantize(Decimal("0.01")), ".2f")


def _timestamp(value) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat(timespec="microseconds")


def _request_payload(data) -> dict:
    outputs = data.outputs or ([{
        "lot_code": data.output_code,
        "product_type": data.product_type,
        "quantity": data.output_quantity,
        "unit": data.unit,
    }] if data.output_quantity > 0 else [])
    return {
        "lot_id": data.lot_id,
        "stage": data.stage,
        "occurred_at": _timestamp(data.occurred_at),
        "input_quantity": _quantity(data.input_quantity),
        "output_quantity": _quantity(data.output_quantity),
        "unit": data.unit,
        "incident": data.incident,
        "output_code": data.output_code,
        "costs_cop": _money(data.costs_cop),
        "sale_price_cop_per_unit": _money(data.sale_price_cop_per_unit) if data.sale_price_cop_per_unit is not None else None,
        "outputs": [{
            "lot_code": output.lot_code if hasattr(output, "lot_code") else output["lot_code"],
            "product_type": output.product_type if hasattr(output, "product_type") else output["product_type"],
            "quantity": _quantity(output.quantity if hasattr(output, "quantity") else output["quantity"]),
            "unit": output.unit if hasattr(output, "unit") else output["unit"],
        } for output in outputs],
    }


def _payload_hash(payload: dict) -> str:
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _stored_payload(db: Session, transformation: Transformation) -> dict:
    linked_outputs = (
        db.query(Lot, TransformationOutput)
        .join(TransformationOutput, TransformationOutput.lot_id == Lot.id)
        .filter(TransformationOutput.transformation_id == transformation.id)
        .order_by(TransformationOutput.id)
        .all()
    )
    return {
        "lot_id": transformation.lot_id,
        "stage": transformation.stage,
        "occurred_at": _timestamp(transformation.occurred_at),
        "input_quantity": _quantity(transformation.input_quantity),
        "output_quantity": _quantity(transformation.output_quantity),
        "unit": transformation.unit,
        "incident": transformation.incident,
        "output_code": transformation.output_code,
        "costs_cop": _money(transformation.costs_cop),
        "sale_price_cop_per_unit": _money(transformation.sale_price_cop_per_unit) if transformation.sale_price_cop_per_unit is not None else None,
        "outputs": [{
            "lot_code": lot.code,
            "product_type": lot.product_type,
            "quantity": _quantity(link.quantity),
            "unit": lot.unit,
        } for lot, link in linked_outputs],
    }


def _replay_or_conflict(db: Session, previous: Transformation, request_hash: str):
    existing_hash = previous.request_hash or _payload_hash(_stored_payload(db, previous))
    if existing_hash != request_hash:
        raise HTTPException(409, "La clave de idempotencia ya fue usada con otra transformación")
    if previous.request_hash is None:
        previous.request_hash = request_hash
        db.commit()
    return _result(db, previous)


def _result(db: Session, transformation: Transformation) -> dict:
    outputs = (
        db.query(Lot, TransformationOutput)
        .join(TransformationOutput, TransformationOutput.lot_id == Lot.id)
        .filter(TransformationOutput.transformation_id == transformation.id)
        .all()
    )
    return {
        "id": transformation.id,
        "idempotency_key": transformation.idempotency_key,
        "lot_id": transformation.lot_id,
        "stage": transformation.stage,
        "responsible_id": transformation.responsible_id,
        "occurred_at": transformation.occurred_at,
        "input_quantity": float(transformation.input_quantity),
        "output_quantity": float(transformation.output_quantity),
        "unit": transformation.unit,
        "incident": transformation.incident,
        "output_code": transformation.output_code,
        "product_type": outputs[0][0].product_type if outputs else "processed_cocoa",
        "outputs": [
            {
                "lot_id": lot.id,
                "lot_code": lot.code,
                "product_type": lot.product_type,
                "quantity": float(link.quantity),
                "unit": lot.unit,
                "status": lot.status,
            }
            for lot, link in outputs
        ],
    }


def create_transformation(db: Session, data, actor: User):
    request_hash = _payload_hash(_request_payload(data))
    previous = db.query(Transformation).filter_by(idempotency_key=data.idempotency_key).first()
    if previous:
        return _replay_or_conflict(db, previous, request_hash)

    lot = db.query(Lot).filter(Lot.id == data.lot_id).with_for_update().first()
    if not lot:
        raise HTTPException(404, "Lote no encontrado")
    if lot.status == "blocked":
        raise HTTPException(409, "No se puede transformar un lote bloqueado")
    if data.unit != lot.unit:
        raise HTTPException(422, "La unidad de la transformación debe coincidir con la del lote")
    if data.input_quantity > float(lot.available_quantity):
        raise HTTPException(409, f"Existencia insuficiente: disponible {lot.available_quantity} {lot.unit}")
    if data.output_quantity > data.input_quantity and not data.incident:
        raise HTTPException(422, "Una salida mayor que la entrada requiere justificar la adición en incidencias")
    planned_outputs = data.outputs or ([{
        "lot_code": data.output_code,
        "product_type": data.product_type,
        "quantity": data.output_quantity,
        "unit": data.unit,
    }] if data.output_quantity > 0 else [])
    if any(output["unit"] != lot.unit if isinstance(output, dict) else output.unit != lot.unit
           for output in planned_outputs):
        raise HTTPException(422, "La unidad de cada salida debe coincidir con la del lote de entrada")

    try:
        transform = Transformation(
            idempotency_key=data.idempotency_key,
            request_hash=request_hash,
            lot_id=lot.id,
            stage=data.stage,
            responsible_id=actor.id,
            occurred_at=data.occurred_at,
            input_quantity=data.input_quantity,
            output_quantity=data.output_quantity,
            unit=data.unit,
            incident=data.incident,
            output_code=data.output_code,
            costs_cop=data.costs_cop,
            sale_price_cop_per_unit=data.sale_price_cop_per_unit,
            output_status="pending",
        )
        db.add(transform)
        db.flush()

        before = {
            "available_quantity": float(lot.available_quantity),
            "consumed_quantity": float(lot.consumed_quantity),
        }
        lot.available_quantity = float(lot.available_quantity) - data.input_quantity
        lot.consumed_quantity = float(lot.consumed_quantity) + data.input_quantity
        db.add(InventoryMovement(
            lot_id=lot.id,
            transformation_id=transform.id,
            actor_id=actor.id,
            reference=f"transformation:{transform.id}:input",
            movement_type="consumption",
            quantity=data.input_quantity,
            unit=lot.unit,
        ))

        output_lots = []
        for output in planned_outputs:
            output_value = output if isinstance(output, dict) else output.model_dump()
            output_lot = Lot(
                code=output_value["lot_code"],
                producer_id=lot.producer_id,
                farm_id=lot.farm_id,
                product_type=output_value["product_type"],
                origin=lot.origin,
                received_on=data.occurred_at.date(),
                received_quantity=output_value["quantity"],
                unit=output_value["unit"],
                available_quantity=output_value["quantity"],
                consumed_quantity=0,
                status="pending",
                status_reason=None,
            )
            db.add(output_lot)
            db.flush()
            output_lots.append(output_lot)
            db.add(TransformationOutput(
                transformation_id=transform.id,
                lot_id=output_lot.id,
                quantity=output_value["quantity"],
            ))
            db.add(InventoryMovement(
                lot_id=output_lot.id,
                transformation_id=transform.id,
                actor_id=actor.id,
                reference=f"transformation:{transform.id}:output:{output_lot.id}",
                movement_type="production",
                quantity=output_value["quantity"],
                unit=output_value["unit"],
            ))

        db.add(FinanceRecord(
            transformation_id=transform.id,
            total_cost_cop=data.costs_cop,
            sale_price_cop_per_unit=data.sale_price_cop_per_unit,
        ))
        db.add(AuditEvent(
            actor_id=actor.id,
            entity_type="lot",
            entity_id=str(lot.id),
            action="inventory_consumed",
            before_value=before,
            after_value={
                "available_quantity": float(lot.available_quantity),
                "consumed_quantity": float(lot.consumed_quantity),
                "transformation_id": transform.id,
                "stage": transform.stage,
                "input_quantity": data.input_quantity,
                "output_quantity": data.output_quantity,
                "output_code": transform.output_code,
                "output_lot_ids": [output_lot.id for output_lot in output_lots],
                "incident": data.incident,
            },
        ))
        db.flush()
        transform_id = transform.id
        db.commit()
    except IntegrityError:
        db.rollback()
        previous = db.query(Transformation).filter_by(idempotency_key=data.idempotency_key).first()
        if previous:
            return _replay_or_conflict(db, previous, request_hash)
        raise HTTPException(409, "La operación duplica una clave o un código de salida")
    except Exception:
        db.rollback()
        raise

    return _result(db, db.get(Transformation, transform_id))
