from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security.permissions import admin_only
from app.services.analytics import dashboard_analytics

router = APIRouter(prefix="/analytics", tags=["Analítica"])


@router.get("/dashboard")
def analytics_dashboard(db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    return dashboard_analytics(db)
