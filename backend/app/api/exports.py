import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import FinanceRecord, Lot, Transformation, User
from app.security.permissions import admin_only

router = APIRouter(prefix="/exports", tags=["Exportaciones"])


@router.get("/lots.csv")
def export_lots(origin: str | None = None, status: str | None = None, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    query = db.query(Lot)
    if origin:
        query = query.filter(Lot.origin.ilike(f"%{origin}%"))
    if status:
        query = query.filter_by(status=status)
    stream = io.StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(["identificador", "origen", "recibido", "consumido", "disponible", "estado", "costos_COP"])
    for lot in query.order_by(Lot.code).all():
        transforms = db.query(Transformation).filter_by(lot_id=lot.id).all()
        costs = sum(float(x.total_cost_cop) for t in transforms if (x := db.query(FinanceRecord).filter_by(transformation_id=t.id).first()))
        writer.writerow([lot.code, lot.origin, float(lot.received_quantity), float(lot.consumed_quantity), float(lot.available_quantity), lot.status, costs])
    stream.seek(0)
    return StreamingResponse(iter([stream.getvalue()]), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": "attachment; filename=lotes.csv"})
