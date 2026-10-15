from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Lot, Producer, Transformation
from app.schemas.api import PublicProduct

router = APIRouter(prefix="/public", tags=["Ficha pública"])


@router.get("/products/{code}", response_model=PublicProduct)
def product_card(code: str, db: Session = Depends(get_db)):
    product = db.query(Transformation).filter_by(output_code=code).first()
    if not product:
        raise HTTPException(404, "Producto no encontrado")
    lot = db.get(Lot, product.lot_id)
    # Explicit allowlist: never serialize user, producer contact, cost, or private lot data.
    return {"code": product.output_code, "stage": product.stage, "occurred_at": product.occurred_at,
            "output_quantity": float(product.output_quantity), "unit": product.unit, "status": product.output_status,
            "status_reason": product.status_reason if product.output_status == "blocked" else None,
            "origin": lot.origin, "received_on": lot.received_on}
