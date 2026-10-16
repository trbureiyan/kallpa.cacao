from datetime import datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models import CostEntry, Lot, Reception, Transformation, TransformationOutput


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _missing_stage_data(responsible_id: int | None, has_processing_cost: bool) -> list[str]:
    missing = []
    if responsible_id is None:
        missing.append("sin responsable asignado")
    if not has_processing_cost:
        missing.append("sin costo total de procesamiento")
    return missing


def build_alerts(db: Session, now: datetime | None = None) -> list[dict]:
    current_time = _as_utc(now or datetime.now(timezone.utc))
    alerts = []

    transformations = db.query(Transformation).all()
    transformations_by_id = {item.id: item for item in transformations}
    input_lots = {lot.id: lot for lot in db.query(Lot).all()}

    outputs_by_transformation: dict[int, list[Lot]] = {}
    last_stage_by_lot: dict[int, datetime] = {}
    for item in transformations:
        occurred_at = _as_utc(item.occurred_at)
        last_stage_by_lot[item.lot_id] = max(last_stage_by_lot.get(item.lot_id, occurred_at), occurred_at)

    for link, lot in (db.query(TransformationOutput, Lot)
                      .join(Lot, Lot.id == TransformationOutput.lot_id).all()):
        outputs_by_transformation.setdefault(link.transformation_id, []).append(lot)
        occurred_at = _as_utc(transformations_by_id[link.transformation_id].occurred_at)
        last_stage_by_lot[lot.id] = max(last_stage_by_lot.get(lot.id, occurred_at), occurred_at)

    processing_costs_by_transformation: dict[int, list[CostEntry]] = {}
    for entry in (db.query(CostEntry)
                  .filter(CostEntry.transformation_id.is_not(None), CostEntry.category == "processing")
                  .all()):
        processing_costs_by_transformation.setdefault(entry.transformation_id, []).append(entry)

    for item in transformations:
        outputs = outputs_by_transformation.get(item.id, [])
        output_quantity = sum(float(lot.received_quantity) for lot in outputs)
        input_lot = input_lots.get(item.lot_id)
        output_code = (outputs[0].code if outputs else item.output_code) or (input_lot.code if input_lot else str(item.lot_id))

        if item.input_quantity > 0:
            loss = (float(item.input_quantity) - output_quantity) / float(item.input_quantity) * 100
            if loss > settings.loss_alert_threshold_percent:
                alerts.append({
                    "type": "merma", "severity": "warning", "entity": output_code,
                    "value_percent": round(loss, 2),
                    "rule": f"Merma mayor al {settings.loss_alert_threshold_percent:g}%",
                    "cause": f"Entrada {item.input_quantity} {item.unit}; salida {output_quantity} {item.unit}",
                })

        processing_entries = processing_costs_by_transformation.get(item.id, [])
        missing = _missing_stage_data(item.responsible_id, bool(processing_entries))
        if missing:
            alerts.append({
                "type": "registro_incompleto", "severity": "warning", "entity": output_code,
                "rule": "Cada etapa debe tener responsable y un registro de costo total de procesamiento.",
                "cause": f"Etapa {item.stage}: {', '.join(missing)}.",
            })

        stage_cost = sum((entry.amount_cop for entry in processing_entries), 0)
        threshold = settings.cost_alert_threshold_cop_per_kg
        if threshold is not None and output_quantity > 0 and float(stage_cost) / output_quantity > threshold:
            alerts.append({
                "type": "costo", "severity": "warning", "entity": output_code,
                "rule": f"Costo unitario supera {threshold:g} COP/kg",
                "cause": f"Costo de etapa {stage_cost} COP / salida {output_quantity} {item.unit}",
            })

    receptions_by_lot = {item.lot_id: item for item in db.query(Reception).all()}
    delay_threshold = timedelta(days=settings.delay_alert_days)
    for lot in input_lots.values():
        if lot.status == "blocked" or lot.available_quantity <= 0:
            continue

        last_stage = last_stage_by_lot.get(lot.id)
        if last_stage:
            reference = "última etapa"
        else:
            reception = receptions_by_lot.get(lot.id)
            last_stage = (_as_utc(reception.received_at) if reception else
                          datetime.combine(lot.received_on, time.min, tzinfo=timezone.utc))
            reference = "recepción"

        elapsed = current_time - last_stage
        if elapsed > delay_threshold:
            elapsed_days = elapsed.total_seconds() / 86400
            alerts.append({
                "type": "retraso", "severity": "warning", "entity": lot.code,
                "rule": (f"Lote con existencia mayor que 0 y estado distinto de bloqueado "
                         f"por más de {settings.delay_alert_days} días desde su {reference}."),
                "cause": (f"Disponible {lot.available_quantity} {lot.unit}; {reference} "
                          f"{last_stage.isoformat()} ({elapsed_days:.1f} días transcurridos)."),
            })

    return alerts
