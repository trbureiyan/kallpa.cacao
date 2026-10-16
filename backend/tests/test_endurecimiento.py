import csv
from datetime import datetime, timezone
from io import StringIO
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main as app_main
from app.config import DEFAULT_SECRET_KEY, Settings
from app.database import Base
from app.models import InventoryMovement, Lot
from app.services import transformation as transformation_service

from conftest import auth
from test_recepcion_lote import reception_payload


def test_csv_neutraliza_formulas_en_codigo_y_origen(api):
    headers = auth(api["operator_token"])
    created = api["client"].post("/api/v1/receptions", json=reception_payload(api["farm_id"]), headers=headers)
    assert created.status_code == 201
    with api["session_factory"]() as db:
        lot = db.query(Lot).one()
        lot.origin = '=HYPERLINK("http://ejemplo.invalid","clic")'
        db.commit()

    response = api["client"].get("/api/v1/exports/lots.csv", headers=auth(api["admin_token"]))

    rows = list(csv.DictReader(StringIO(response.text)))
    assert rows[0]["origen"].startswith("'=")
    assert rows[0]["disponible"] == "100.0"


def test_clave_de_idempotencia_se_reconsulta_tras_bloquear_el_lote(api, monkeypatch):
    # Simula la carrera: el reenvio no vio la clave en su primera consulta (la otra peticion aun no confirmaba),
    # espero el bloqueo del lote y, al obtenerlo, el saldo ya estaba consumido.
    headers = auth(api["operator_token"])
    reception = api["client"].post("/api/v1/receptions", json=reception_payload(api["farm_id"]), headers=headers)
    request = {
        "idempotency_key": str(uuid4()),
        "lot_id": reception.json()["lot_id"],
        "stage": "secado",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "input_quantity": 100,
        "output_quantity": 80,
        "unit": "kg",
        "output_code": "DRY-RACE-001",
        "product_type": "dried_cocoa",
        "costs_cop": 0,
    }
    first = api["client"].post("/api/v1/transformations", json=request, headers=headers)
    assert first.status_code == 201

    real_find = transformation_service._find_by_key
    calls = {"n": 0}

    def find_once_blind(db, key):
        calls["n"] += 1
        return None if calls["n"] == 1 else real_find(db, key)

    monkeypatch.setattr(transformation_service, "_find_by_key", find_once_blind)
    replay = api["client"].post("/api/v1/transformations", json=request, headers=headers)

    assert replay.status_code == 201, replay.text
    assert replay.json()["id"] == first.json()["id"]
    with api["session_factory"]() as db:
        consumed = db.query(func.sum(InventoryMovement.quantity)).filter_by(movement_type="consumption").scalar()
        assert float(consumed) == 100


def test_sembrado_deja_movimiento_de_recepcion_por_cada_lote(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(app_main, "SessionLocal", sessionmaker(bind=engine, expire_on_commit=False))
    monkeypatch.setattr(app_main.settings, "seed_demo_data", True)

    app_main.initialize_database()

    with sessionmaker(bind=engine)() as db:
        lots = db.query(Lot).order_by(Lot.code).all()
        assert [lot.code for lot in lots] == ["CAC001", "CAC002", "CAC003"]
        for lot in lots:
            ledger = db.query(func.sum(InventoryMovement.quantity)).filter_by(lot_id=lot.id).scalar()
            assert ledger == lot.available_quantity
    engine.dispose()


def test_clave_por_defecto_se_rechaza_en_produccion():
    with pytest.raises(ValueError):
        Settings(_env_file=None, environment="production", secret_key=DEFAULT_SECRET_KEY)
    assert Settings(_env_file=None, environment="production", secret_key="x" * 40).environment == "production"
    assert Settings(_env_file=None, environment="development").secret_key == DEFAULT_SECRET_KEY
