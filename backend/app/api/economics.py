from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CostEntry, Lot, Transformation, TransformationOutput, User
from app.security.permissions import admin_only
from app.services.economics import summarize_cost

router = APIRouter(prefix="/economics", tags=["Economía"])


def _summary(db: Session, transform: Transformation) -> dict:
    outputs = (db.query(Lot, TransformationOutput)
               .join(TransformationOutput, TransformationOutput.lot_id == Lot.id)
               .filter(TransformationOutput.transformation_id == transform.id)
               .order_by(TransformationOutput.id).all())
    entries = db.query(CostEntry).filter_by(transformation_id=transform.id).all()
    total_cost = sum((entry.amount_cop for entry in entries), 0)
    categories = sorted({entry.category for entry in entries})
    sale_price = float(transform.sale_price_cop_per_unit) if transform.sale_price_cop_per_unit is not None else None
    output_quantity = sum(float(lot.received_quantity) for lot, _ in outputs)
    return {
        "transformation_id": transform.id,
        "output_code": outputs[0][0].code if outputs else transform.output_code,
        "stage": transform.stage,
        "occurred_at": transform.occurred_at,
        "output_quantity": output_quantity,
        "unit": transform.unit,
        "total_cost_cop": float(total_cost),
        "sale_price_cop_per_unit": sale_price,
        **summarize_cost(output_quantity, float(total_cost), sale_price, categories),
    }


@router.get("")
def economics_list(db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    return [_summary(db, transform) for transform in
            db.query(Transformation).order_by(Transformation.occurred_at.desc()).all()]


@router.get("/{transformation_id}")
def economics(transformation_id: int, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    transform = db.get(Transformation, transformation_id)
    if not transform:
        raise HTTPException(404, "Registro económico no encontrado")
    return _summary(db, transform)
