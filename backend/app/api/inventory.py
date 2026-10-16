from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import InventoryMovement, Lot, User
from app.security.permissions import current_user

router = APIRouter(prefix="/inventory", tags=["Inventario"])


@router.get("")
def inventory(db: Session = Depends(get_db), actor: User = Depends(current_user)):
    return [{"lot_id": lot.id, "lot_code": lot.code, "product_type": lot.product_type, "origin": lot.origin,
             "available_quantity": lot.available_quantity, "unit": lot.unit, "status": lot.status}
            for lot in db.query(Lot).order_by(Lot.code).all()]


@router.get("/movements")
def movements(db: Session = Depends(get_db), actor: User = Depends(current_user)):
    return db.query(InventoryMovement).order_by(InventoryMovement.created_at.desc()).all()

