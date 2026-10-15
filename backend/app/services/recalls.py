from sqlalchemy.orm import Session
from app.models import Lot, Transformation


def affected_quantities(db: Session, output_code: str):
    product = db.query(Transformation).filter_by(output_code=output_code).first()
    if not product:
        return None
    lot = db.get(Lot, product.lot_id)
    return {"product_code": output_code, "origin": lot.origin, "lot_code": lot.code,
            "input_quantity": float(product.input_quantity), "output_quantity": float(product.output_quantity),
            "consumed_quantity_total": float(lot.consumed_quantity), "unit": lot.unit}
