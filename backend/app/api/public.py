from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Lot, Transformation, TransformationOutput
from app.schemas.api import PublicProduct
from app.services.traceability import trace_lot

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
            "output_quantity": float(lot.received_quantity), "unit": lot.unit, "status": lot.status,
            "availability": "available" if lot.status == "released" else "not_available",
            "status_reason": lot.status_reason if lot.status == "blocked" else None,
            "origin": lot.origin, "received_on": lot.received_on}


@router.get("/products/{code}/traceability")
def public_traceability(code: str, db: Session = Depends(get_db)):
    lot = db.query(Lot).filter_by(code=code).first()
    if not lot:
        raise HTTPException(404, "Producto no encontrado")
    trace = trace_lot(db, lot.id)
    timeline = []
    for origin in trace["origin_lots"]:
        source = origin["lot"]
        timeline.append({"kind": "reception", "lot_code": source.code, "origin": source.origin,
                         "date": source.received_on, "quantity": float(source.received_quantity), "unit": source.unit})
    for entry in sorted(trace["upstream_transformations"], key=lambda item: item["transformation"].occurred_at):
        transformation = entry["transformation"]
        output_lot = entry["output_lot"]
        timeline.append({"kind": "transformation", "stage": transformation.stage,
                         "date": transformation.occurred_at, "input_quantity": float(transformation.input_quantity),
                         "output_code": output_lot.code, "output_quantity": float(output_lot.received_quantity),
                         "unit": transformation.unit})
    return {"code": lot.code, "product_type": lot.product_type, "status": lot.status,
            "availability": "available" if lot.status == "released" else "not_available",
            "origin": lot.origin, "timeline": timeline}
