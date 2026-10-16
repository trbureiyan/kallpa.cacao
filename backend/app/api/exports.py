import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CostEntry, Lot, User
from app.security.permissions import admin_only

router = APIRouter(prefix="/exports", tags=["Exportaciones"])


@router.get("/lots.csv")
def export_lots(origin: str | None = None, status: str | None = None,
                db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    query = db.query(Lot)
    if origin:
        query = query.filter(Lot.origin.ilike(f"%{origin}%"))
    if status:
        query = query.filter_by(status=status)
    lots = query.order_by(Lot.code).all()
    costs_by_lot: dict[int, float] = {}
    lot_ids = [lot.id for lot in lots]
    if lot_ids:
        for entry in db.query(CostEntry).filter(CostEntry.lot_id.in_(lot_ids)).all():
            costs_by_lot[entry.lot_id] = costs_by_lot.get(entry.lot_id, 0) + float(entry.amount_cop)

    stream = io.StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(["identificador", "origen", "recibido", "consumido", "disponible", "estado", "costos_COP"])
    for lot in lots:
        writer.writerow([
            lot.code, lot.origin, float(lot.received_quantity), float(lot.consumed_quantity),
            float(lot.available_quantity), lot.status, costs_by_lot.get(lot.id, 0),
        ])
    stream.seek(0)
    return StreamingResponse(iter([stream.getvalue()]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": "attachment; filename=lotes.csv"})
