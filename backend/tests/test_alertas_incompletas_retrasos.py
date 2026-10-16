from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.models import CostEntry, Lot, Producer, Reception, Transformation, TransformationOutput, User
from app.services.alerts import build_alerts
from conftest import auth
from test_recepcion_lote import reception_payload


def _make_raw_lot(db, *, code, producer_id, farm_id, received_at, available, status="pending"):
    lot = Lot(
        code=code,
        producer_id=producer_id,
        farm_id=farm_id,
        product_type="raw_cocoa",
        origin="Rivera",
        received_on=received_at.date(),
        received_quantity=100,
        available_quantity=available,
        consumed_quantity=100 - available,
        unit="kg",
        status=status,
    )
    db.add(lot)
    db.flush()
    db.add(Reception(
        idempotency_key=str(uuid4()),
        lot_id=lot.id,
        farm_id=farm_id,
        received_at=received_at,
        quantity_kg=100,
        purchase_total_cop=0,
    ))
    return lot


def test_alerta_incompleto_si_etapa_no_tiene_costos_de_procesamiento(api):
    client = api["client"]
    operator_headers = auth(api["operator_token"])
    reception = client.post(
        "/api/v1/receptions",
        json=reception_payload(api["farm_id"]),
        headers=operator_headers,
    )
    assert reception.status_code == 201, reception.text
    transformation = client.post("/api/v1/transformations", headers=operator_headers, json={
        "idempotency_key": str(uuid4()),
        "lot_id": reception.json()["lot_id"],
        "stage": "secado",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "input_quantity": 100,
        "output_quantity": 80,
        "unit": "kg",
        "output_code": "MISSING-COST-TEST",
        "costs_cop": 150000,
    })
    assert transformation.status_code == 201, transformation.text

    with api["session_factory"]() as db:
        db.query(CostEntry).filter_by(transformation_id=transformation.json()["id"]).delete()
        db.commit()

    forbidden = client.get("/api/v1/alerts", headers=operator_headers)
    assert forbidden.status_code == 403
    alerts = client.get("/api/v1/alerts", headers=auth(api["admin_token"]))

    incomplete = next(item for item in alerts.json() if item["type"] == "registro_incompleto")
    assert incomplete["entity"] == "MISSING-COST-TEST"
    assert "costo" in incomplete["cause"].lower()
    assert incomplete["rule"]


def test_alerta_retraso_usa_ultima_etapa_y_aplica_mas_de_siete_dias(api, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "delay_alert_days", 7)
    now = datetime(2026, 10, 16, 12, tzinfo=timezone.utc)
    with api["session_factory"]() as db:
        producer = db.query(Producer).filter_by(code="PROD-TEST").one()
        operator = db.query(User).filter_by(username="operador_test").one()

        old_raw = _make_raw_lot(
            db, code="OLD-RAW-ALERT", producer_id=producer.id, farm_id=api["farm_id"],
            received_at=now - timedelta(days=8), available=25,
        )
        exact_threshold = _make_raw_lot(
            db, code="EXACT-SEVEN-DAYS", producer_id=producer.id, farm_id=api["farm_id"],
            received_at=now - timedelta(days=7), available=25,
        )
        blocked = _make_raw_lot(
            db, code="BLOCKED-OLD-LOT", producer_id=producer.id, farm_id=api["farm_id"],
            received_at=now - timedelta(days=20), available=25, status="blocked",
        )
        consumed = _make_raw_lot(
            db, code="CONSUMED-OLD-LOT", producer_id=producer.id, farm_id=api["farm_id"],
            received_at=now - timedelta(days=20), available=0,
        )

        old_input = _make_raw_lot(
            db, code="RECENT-STAGE-INPUT", producer_id=producer.id, farm_id=api["farm_id"],
            received_at=now - timedelta(days=20), available=50,
        )
        stage_time = now - timedelta(days=2)
        output = Lot(
            code="RECENT-STAGE-OUTPUT",
            producer_id=producer.id,
            farm_id=api["farm_id"],
            product_type="processed_cocoa",
            origin="Rivera",
            received_on=stage_time.date(),
            received_quantity=40,
            available_quantity=40,
            consumed_quantity=0,
            unit="kg",
            status="pending",
        )
        db.add(output)
        db.flush()
        transformation = Transformation(
            idempotency_key=str(uuid4()),
            lot_id=old_input.id,
            stage="secado",
            responsible_id=operator.id,
            occurred_at=stage_time,
            input_quantity=50,
            unit="kg",
        )
        db.add(transformation)
        db.flush()
        db.add(TransformationOutput(transformation_id=transformation.id, lot_id=output.id))
        db.add(CostEntry(
            lot_id=output.id,
            transformation_id=transformation.id,
            category="processing",
            amount_cop=0,
        ))
        db.commit()

        alerts = build_alerts(db, now=now)

    delays = [item for item in alerts if item["type"] == "retraso"]
    assert not any(item["type"] == "registro_incompleto" for item in alerts)
    assert [item["entity"] for item in delays] == ["OLD-RAW-ALERT"]
    assert "7" in delays[0]["rule"]
    assert "8" in delays[0]["cause"]
    assert old_raw.code == "OLD-RAW-ALERT"
    assert exact_threshold.code == "EXACT-SEVEN-DAYS"
    assert blocked.code == "BLOCKED-OLD-LOT"
    assert consumed.code == "CONSUMED-OLD-LOT"


def test_etapa_con_costo_cero_registrado_no_es_incompleta():
    from app.services.alerts import _missing_stage_data

    assert _missing_stage_data(responsible_id=2, has_processing_cost=True) == []


def test_etapa_sin_responsable_y_sin_total_de_costos_es_incompleta():
    from app.services.alerts import _missing_stage_data

    assert _missing_stage_data(responsible_id=None, has_processing_cost=False) == [
        "sin responsable asignado",
        "sin costo total de procesamiento",
    ]
