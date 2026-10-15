from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import FinanceRecord, Transformation, User
from app.security.permissions import admin_only
from app.services.economics import summarize_cost

router = APIRouter(prefix="/economics", tags=["Economía"])


@router.get("/{transformation_id}")
def economics(transformation_id: int, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    transform = db.get(Transformation, transformation_id)
    record = db.query(FinanceRecord).filter_by(transformation_id=transformation_id).first()
    if not transform or not record:
        raise HTTPException(404, "Registro económico no encontrado")
    return {"transformation_id": transform.id, "output_quantity": float(transform.output_quantity), "unit": transform.unit,
            "total_cost_cop": float(record.total_cost_cop), "sale_price_cop_per_unit": float(record.sale_price_cop_per_unit) if record.sale_price_cop_per_unit is not None else None,
            **summarize_cost(float(transform.output_quantity), float(record.total_cost_cop), float(record.sale_price_cop_per_unit) if record.sale_price_cop_per_unit is not None else None)}
