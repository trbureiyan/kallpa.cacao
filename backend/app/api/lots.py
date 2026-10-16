from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuditEvent, Lot, Transformation, TransformationOutput, User
from app.schemas.api import StatusChange
from app.security.permissions import admin_only, current_user
from app.services.traceability import trace_lot

router = APIRouter(prefix="/lots", tags=["Lotes y trazabilidad"])


def _change_lot_status(lot: Lot, data: StatusChange, db: Session, actor: User):
    before = {"status": lot.status, "reason": lot.status_reason}
    link = db.query(TransformationOutput).filter_by(lot_id=lot.id).first()
    lot.status = data.status
    lot.status_reason = data.reason
    db.add(AuditEvent(actor_id=actor.id, entity_type="lot", entity_id=str(lot.id), action="status_changed",
                      before_value=before, after_value={"status": data.status, "reason": data.reason}))
    if link:
        db.add(AuditEvent(actor_id=actor.id, entity_type="product", entity_id=lot.code, action="status_changed",
                          before_value=before, after_value={"status": data.status, "reason": data.reason,
                                                            "lot_code": lot.code}))
    db.commit()
    return {"code": lot.code, "status": lot.status, "reason": lot.status_reason}


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
    lot = db.get(Lot, lot_id)
    if not lot:
        raise HTTPException(404, "Lote no encontrado")
    transformation_ids = [item.id for item in db.query(Transformation.id).filter_by(lot_id=lot_id).all()]
    output_transformation_ids = [item.transformation_id for item in db.query(TransformationOutput).filter_by(lot_id=lot_id).all()]
    transformation_ids = sorted(set(transformation_ids + output_transformation_ids))
    predicates = [
        (AuditEvent.entity_type == "lot") & (AuditEvent.entity_id == str(lot_id)),
    ]
    if transformation_ids:
        predicates.append((AuditEvent.entity_type == "transformation") &
                          AuditEvent.entity_id.in_([str(item) for item in transformation_ids]))
    rows = (db.query(AuditEvent, User)
            .join(User, AuditEvent.actor_id == User.id)
            .filter(or_(*predicates))
            .order_by(AuditEvent.created_at, AuditEvent.id)
            .all())
    return [{
        "id": event.id,
        "actor_id": event.actor_id,
        "actor_name": user.full_name,
        "actor_username": user.username,
        "entity_type": event.entity_type,
        "entity_id": event.entity_id,
        "action": event.action,
        "before_value": event.before_value,
        "after_value": event.after_value,
        "created_at": event.created_at,
    } for event, user in rows]


@router.patch("/products/{output_code}/status")
def change_product_status(output_code: str, data: StatusChange, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    lot = db.query(Lot).filter_by(code=output_code).first()
    if not lot:
        raise HTTPException(404, "Producto no encontrado")
    link = db.query(TransformationOutput).filter_by(lot_id=lot.id).first()
    if not link:
        raise HTTPException(404, "El producto no tiene un lote de salida disponible")
    return _change_lot_status(lot, data, db, actor)


@router.patch("/{lot_id}/status")
def change_lot_status(lot_id: int, data: StatusChange, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    lot = db.get(Lot, lot_id)
    if not lot:
        raise HTTPException(404, "Lote no encontrado")
    return _change_lot_status(lot, data, db, actor)
