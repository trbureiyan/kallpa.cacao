from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.database import Base
from app.security.authentication import hash_password

# alembic_version no es un dato de la demo: borrarla haría que el siguiente arranque intente migrar desde cero
TABLAS_QUE_SE_CONSERVAN = {"alembic_version"}


def sembrar_demo(db: Session) -> None:
    """Crea los datos básicos de demostración (usuarios, productores, fincas y CAC001-003) si faltan. Es idempotente."""
    if db.query(models.User).count() == 0:
        db.add_all([
            models.User(username="admin", full_name="Administrador demo", password_hash=hash_password("Admin123!"), role="admin"),
            models.User(username="operador", full_name="Operador demo", password_hash=hash_password("Operador123!"), role="operator"),
        ])
    if db.query(models.Producer).count() == 0:
        db.add_all([models.Producer(code="PROD-A", name="Productor A"), models.Producer(code="PROD-B", name="Productor B"), models.Producer(code="PROD-C", name="Productor C")])
    db.commit()
    if db.query(models.Farm).count() == 0:
        producers = {p.code: p.id for p in db.query(models.Producer).all()}
        db.add_all([models.Farm(producer_id=producers["PROD-A"], name="Finca A", region="Rivera"),
                    models.Farm(producer_id=producers["PROD-B"], name="Finca B", region="Campoalegre"),
                    models.Farm(producer_id=producers["PROD-C"], name="Finca C", region="Algeciras")])
        db.commit()
    if db.query(models.Lot).count() == 0:
        producers = {p.code: p.id for p in db.query(models.Producer).all()}
        farms = {f.region: f.id for f in db.query(models.Farm).all()}
        db.add_all([
            models.Lot(code="CAC001", producer_id=producers["PROD-A"], farm_id=farms["Rivera"], origin="Rivera", received_on=date.today(), received_quantity=100, available_quantity=100, consumed_quantity=0, unit="kg"),
            models.Lot(code="CAC002", producer_id=producers["PROD-B"], farm_id=farms["Campoalegre"], origin="Campoalegre", received_on=date.today(), received_quantity=150, available_quantity=150, consumed_quantity=0, unit="kg"),
            models.Lot(code="CAC003", producer_id=producers["PROD-C"], farm_id=farms["Algeciras"], origin="Algeciras", received_on=date.today(), received_quantity=80, available_quantity=80, consumed_quantity=0, unit="kg"),
        ])
        db.commit()


def reiniciar_demo(db: Session) -> None:
    """Vacía todas las tablas de datos y vuelve a sembrar la demo. Solo para una base de demostración, nunca real.

    En PostgreSQL usa TRUNCATE: la auditoría rechaza DELETE por trigger y TRUNCATE no lo dispara. Es un vaciado
    deliberado de una demo y por eso vive en un script aparte, nunca en la API.
    """
    tablas = [t.name for t in Base.metadata.sorted_tables if t.name not in TABLAS_QUE_SE_CONSERVAN]
    if db.get_bind().dialect.name == "postgresql":
        db.execute(text("TRUNCATE TABLE " + ", ".join(f'"{t}"' for t in tablas) + " RESTART IDENTITY CASCADE"))
    else:
        for nombre in reversed(tablas):
            db.execute(Base.metadata.tables[nombre].delete())
    db.commit()
    # los objetos cargados antes del vaciado ya no existen; sin esto el reinicio de ids choca con el mapa de identidad
    db.expunge_all()
    sembrar_demo(db)
