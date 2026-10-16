from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import CostEntry, InventoryMovement, Lot, User
from app.security.permissions import admin_only, current_user

router = APIRouter(prefix="/inventory", tags=["Inventario"])


@router.get("")
def inventory(db: Session = Depends(get_db), actor: User = Depends(current_user)):
    return [{"lot_id": lot.id, "lot_code": lot.code, "product_type": lot.product_type, "origin": lot.origin,
             "available_quantity": lot.available_quantity, "unit": lot.unit, "status": lot.status}
            for lot in db.query(Lot).order_by(Lot.code).all()]


@router.get("/admin")
def admin_inventory(origin: str | None = None, status: str | None = None,
                    db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    query = db.query(Lot)
    if origin:
        query = query.filter(Lot.origin.ilike(f"%{origin}%"))
    if status:
        query = query.filter_by(status=status)
    lots = query.order_by(Lot.code).all()
    lot_ids = [lot.id for lot in lots]
    costs_by_lot: dict[int, float] = {}
    if lot_ids:
        for entry in db.query(CostEntry).filter(CostEntry.lot_id.in_(lot_ids)).all():
            costs_by_lot[entry.lot_id] = costs_by_lot.get(entry.lot_id, 0) + float(entry.amount_cop)
    return [{
        "id": lot.id,
        "code": lot.code,
        "origin": lot.origin,
        "received_quantity": lot.received_quantity,
        "consumed_quantity": lot.consumed_quantity,
        "available_quantity": lot.available_quantity,
        "unit": lot.unit,
        "status": lot.status,
        "status_reason": lot.status_reason,
        "costs_cop": costs_by_lot.get(lot.id, 0),
    } for lot in lots]


@router.get("/movements")
def movements(db: Session = Depends(get_db), actor: User = Depends(current_user)):
    return db.query(InventoryMovement).order_by(InventoryMovement.created_at.desc()).all()

