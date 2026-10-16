from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuditEvent, Lot, Transformation, TransformationOutput, User
from app.schemas.api import StatusChange
from app.security.permissions import admin_only, current_user
from app.services.traceability import trace_lot

router = APIRouter(prefix="/lots", tags=["Lotes y trazabilidad"])


@router.get("/{lot_id}")
def get_lot(lot_id: int, db: Session = Depends(get_db), actor: User = Depends(current_user)):
    lot = db.get(Lot, lot_id)
    if not lot:
        raise HTTPException(404, "Lote no encontrado")
    return lot


@router.get("/{lot_id}/movements")
def get_lot_movements(lot_id: int, db: Session = Depends(get_db), actor: User = Depends(current_user)):
    from app.models import InventoryMovement
    if not db.get(Lot, lot_id):
        raise HTTPException(404, "Lote no encontrado")
    return db.query(InventoryMovement).filter_by(lot_id=lot_id).order_by(InventoryMovement.created_at).all()


@router.get("")
def list_lots(origin: str | None = None, status: str | None = None, db: Session = Depends(get_db), actor: User = Depends(current_user)):
    query = db.query(Lot)
    if origin:
        query = query.filter(Lot.origin.ilike(f"%{origin}%"))
    if status:
        query = query.filter_by(status=status)
    return query.order_by(Lot.received_on.desc()).all()


@router.get("/{lot_id}/traceability")
def get_trace(lot_id: int, db: Session = Depends(get_db), actor: User = Depends(current_user)):
    result = trace_lot(db, lot_id)
    if not result:
        raise HTTPException(404, "Lote no encontrado")
    return result


@router.get("/{lot_id}/audit")
def get_lot_audit(lot_id: int, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    if not db.get(Lot, lot_id):
        raise HTTPException(404, "Lote no encontrado")
    return db.query(AuditEvent).filter(AuditEvent.entity_id == str(lot_id), AuditEvent.entity_type == "lot").order_by(AuditEvent.created_at).all()


@router.patch("/products/{output_code}/status")
def change_product_status(output_code: str, data: StatusChange, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    lot = db.query(Lot).filter_by(code=output_code).first()
    if not lot:
        raise HTTPException(404, "Producto no encontrado")
    link = db.query(TransformationOutput).filter_by(lot_id=lot.id).first()
    product = db.get(Transformation, link.transformation_id) if link else None
    if not product:
        raise HTTPException(404, "El producto no tiene un lote de salida disponible")
    before = {"status": lot.status, "reason": lot.status_reason}
    if product.output_code == lot.code:
        product.output_status = data.status
        product.status_reason = data.reason
    lot.status = data.status
    lot.status_reason = data.reason
    db.add(AuditEvent(actor_id=actor.id, entity_type="product", entity_id=output_code, action="status_changed", before_value=before,
                      after_value={"status": data.status, "reason": data.reason, "lot_code": lot.code}))
    db.add(AuditEvent(actor_id=actor.id, entity_type="lot", entity_id=str(lot.id), action="status_changed", before_value=before,
                      after_value={"status": data.status, "reason": data.reason, "product_code": output_code}))
    db.commit()
    return {"code": lot.code, "status": lot.status, "reason": lot.status_reason}
