from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas.api import TransformationCreate
from app.security.permissions import current_user, operator_or_admin
from app.services.transformation import create_transformation, list_transformations

router = APIRouter(prefix="/transformations", tags=["Transformaciones"])


@router.post("", status_code=201)
def add_transformation(data: TransformationCreate, db: Session = Depends(get_db), actor: User = Depends(operator_or_admin)):
    return create_transformation(db, data, actor)


@router.get("")
def get_transformations(db: Session = Depends(get_db), actor: User = Depends(current_user)):
    return list_transformations(db)
