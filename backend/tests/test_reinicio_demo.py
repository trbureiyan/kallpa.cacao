"""El reinicio semanal deja solo los datos básicos de demostración y deja intacto el esquema."""
from datetime import date

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.database import Base
from app.seed import reiniciar_demo, sembrar_demo


@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine, expire_on_commit=False)() as sesion:
        yield sesion
    engine.dispose()


def _contar(db, modelo) -> int:
    return db.scalar(select(func.count()).select_from(modelo))


def test_sembrar_demo_crea_usuarios_productores_fincas_y_tres_lotes(db):
    sembrar_demo(db)
    assert sorted(u.username for u in db.query(models.User)) == ["admin", "operador"]
    assert sorted(l.code for l in db.query(models.Lot)) == ["CAC001", "CAC002", "CAC003"]
    assert _contar(db, models.Producer) == 3 and _contar(db, models.Farm) == 3


def test_sembrar_demo_es_idempotente(db):
    sembrar_demo(db)
    sembrar_demo(db)
    assert _contar(db, models.Lot) == 3 and _contar(db, models.User) == 2


def test_reiniciar_demo_borra_lo_creado_por_visitantes_y_restaura_lo_basico(db):
    sembrar_demo(db)
    productor = db.query(models.Producer).first()
    finca = db.query(models.Farm).first()
    db.add(models.Lot(code="CAC999", producer_id=productor.id, farm_id=finca.id, origin="Rivera", received_on=date.today(),
                      received_quantity=5, available_quantity=5, consumed_quantity=0, unit="kg"))
    db.add(models.User(username="intruso", full_name="Visitante", password_hash="x", role="operator"))
    db.commit()

    reiniciar_demo(db)

    assert sorted(l.code for l in db.query(models.Lot)) == ["CAC001", "CAC002", "CAC003"]
    assert sorted(u.username for u in db.query(models.User)) == ["admin", "operador"]


def test_reiniciar_demo_deja_la_cantidad_original_de_los_lotes(db):
    sembrar_demo(db)
    lote = db.query(models.Lot).filter_by(code="CAC001").one()
    lote.available_quantity = 0
    lote.consumed_quantity = 100
    db.commit()

    reiniciar_demo(db)

    lote = db.query(models.Lot).filter_by(code="CAC001").one()
    assert (lote.received_quantity, lote.available_quantity, lote.consumed_quantity) == (100, 100, 0)
