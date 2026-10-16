from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Lot, Transformation, TransformationOutput
from app.schemas.api import PublicProduct

router = APIRouter(prefix="/public", tags=["Ficha pública"])


@router.get("/products/{code}", response_model=PublicProduct)
def product_card(code: str, db: Session = Depends(get_db)):
    lot = db.query(Lot).filter_by(code=code).first()
    if not lot:
        raise HTTPException(404, "Producto no encontrado")
    link = db.query(TransformationOutput).filter_by(lot_id=lot.id).first()
    product = db.get(Transformation, link.transformation_id) if link else None
    if not product:
        raise HTTPException(404, "Producto sin lote de salida")
    # Explicit allowlist: never serialize user, producer contact, cost, or private lot data.
    return {"code": lot.code, "product_type": lot.product_type, "stage": product.stage, "occurred_at": product.occurred_at,
            "output_quantity": float(link.quantity), "unit": lot.unit, "status": lot.status,
            "status_reason": lot.status_reason if lot.status == "blocked" else None,
            "origin": lot.origin, "received_on": lot.received_on}
