from sqlalchemy.orm import Session
from app.models import Lot


def inventory_snapshot(db: Session, lot_id: int):
    lot = db.get(Lot, lot_id)
    if not lot:
        return None
    return {"received": float(lot.received_quantity), "consumed": float(lot.consumed_quantity),
            "available": float(lot.available_quantity), "unit": lot.unit}
