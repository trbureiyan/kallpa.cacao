from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CostEntry, Lot, Transformation, TransformationOutput, User
from app.security.permissions import admin_only

router = APIRouter(prefix="/alerts", tags=["Alertas"])


@router.get("")
def list_alerts(db: Session = Depends(get_db), actor: User = Depends(admin_only)):
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
            if loss > 15:
                alerts.append({"type": "merma", "severity": "warning", "entity": output_code,
                               "value_percent": round(loss, 2), "rule": "Merma mayor al 15%",
                               "cause": f"Entrada {item.input_quantity} {item.unit}; salida {output_quantity} {item.unit}"})
        stage_cost = sum((entry.amount_cop for entry in db.query(CostEntry).filter_by(
            transformation_id=item.id).all()), 0)
        if output_quantity > 0 and float(stage_cost) / output_quantity > 25000:
            alerts.append({"type": "costo", "severity": "warning", "entity": output_code,
                           "rule": "Costo unitario supera 25.000 COP",
                           "cause": f"Costo de etapa {stage_cost} COP / salida {output_quantity} {item.unit}"})
    return alerts
