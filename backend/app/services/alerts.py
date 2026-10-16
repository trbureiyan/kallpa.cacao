from app.config import settings
from app.models import CostEntry, Lot, Transformation, TransformationOutput
from sqlalchemy.orm import Session


def build_alerts(db: Session) -> list[dict]:
    alerts = []
    for item in db.query(Transformation).all():
        outputs = (db.query(Lot, TransformationOutput)
                   .join(TransformationOutput, TransformationOutput.lot_id == Lot.id)
                   .filter(TransformationOutput.transformation_id == item.id)
                   .order_by(TransformationOutput.id).all())
        output_quantity = sum(float(lot.received_quantity) for lot, _ in outputs)
        output_code = outputs[0][0].code if outputs else item.output_code
        if item.input_quantity > 0:
            loss = (float(item.input_quantity) - output_quantity) / float(item.input_quantity) * 100
            if loss > settings.loss_alert_threshold_percent:
                alerts.append({
                    "type": "merma", "severity": "warning", "entity": output_code,
                    "value_percent": round(loss, 2),
                    "rule": f"Merma mayor al {settings.loss_alert_threshold_percent:g}%",
                    "cause": f"Entrada {item.input_quantity} {item.unit}; salida {output_quantity} {item.unit}",
                })
        stage_cost = sum((entry.amount_cop for entry in db.query(CostEntry).filter_by(
            transformation_id=item.id).all()), 0)
        threshold = settings.cost_alert_threshold_cop_per_kg
        if threshold is not None and output_quantity > 0 and float(stage_cost) / output_quantity > threshold:
            alerts.append({
                "type": "costo", "severity": "warning", "entity": output_code,
                "rule": f"Costo unitario supera {threshold:g} COP/kg",
                "cause": f"Costo de etapa {stage_cost} COP / salida {output_quantity} {item.unit}",
            })
    return alerts
