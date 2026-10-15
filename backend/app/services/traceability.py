from sqlalchemy.orm import Session
from app.models import Lot, Producer, Transformation


def trace_lot(db: Session, lot_id: int):
    lot = db.get(Lot, lot_id)
    if not lot:
        return None
    producer = db.get(Producer, lot.producer_id)
    transformations = db.query(Transformation).filter_by(lot_id=lot.id).order_by(Transformation.occurred_at).all()
    return {"lot": lot, "producer": producer, "transformations": transformations,
            "current_inventory": float(lot.available_quantity), "unit": lot.unit}
