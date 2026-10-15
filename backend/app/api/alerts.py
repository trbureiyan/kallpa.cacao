from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import FinanceRecord, Transformation, User
from app.security.permissions import admin_only

router = APIRouter(prefix="/alerts", tags=["Alertas"])


@router.get("")
def list_alerts(db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    alerts = []
    for item in db.query(Transformation).all():
        if item.input_quantity > 0:
            loss = (float(item.input_quantity) - float(item.output_quantity)) / float(item.input_quantity) * 100
            if loss > 15:
                alerts.append({"type": "merma", "severity": "warning", "entity": item.output_code,
                               "value_percent": round(loss, 2), "rule": "Merma mayor al 15%",
                               "cause": f"Entrada {item.input_quantity} {item.unit}; salida {item.output_quantity} {item.unit}"})
        finance = db.query(FinanceRecord).filter_by(transformation_id=item.id).first()
        if finance and item.output_quantity > 0 and float(finance.total_cost_cop) / float(item.output_quantity) > 25000:
            alerts.append({"type": "costo", "severity": "warning", "entity": item.output_code,
                           "rule": "Costo unitario supera 25.000 COP", "cause": f"Costo unitario calculado para {item.output_code}"})
    return alerts
