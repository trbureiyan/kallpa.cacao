from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security.permissions import admin_only
from app.services.alerts import build_alerts

router = APIRouter(prefix="/alerts", tags=["Alertas"])


@router.get("")
def list_alerts(db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    return build_alerts(db)
