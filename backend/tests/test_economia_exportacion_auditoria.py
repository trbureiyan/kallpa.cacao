import csv
from datetime import datetime, timezone
from io import StringIO
from uuid import uuid4

import pytest

from app.models import AuditEvent
from conftest import auth
from test_recepcion_lote import reception_payload


def _receive_and_transform(api, quantity="100.000", purchase="1200000.00", cost=1600000,
                           output_code="ECONOMY-OUTPUT", output_quantity=80, sale_price=25000):
    client = api["client"]
    operator_headers = auth(api["operator_token"])
    payload = reception_payload(api["farm_id"], quantity=quantity)
    payload["purchase_total_cop"] = purchase
    reception = client.post("/api/v1/receptions", headers=operator_headers, json=payload)
    assert reception.status_code == 201, reception.text
    transformation = client.post("/api/v1/transformations", headers=operator_headers, json={
        "idempotency_key": str(uuid4()),
        "lot_id": reception.json()["lot_id"],
        "stage": "secado",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "input_quantity": 100,
        "output_quantity": output_quantity,
        "unit": "kg",
        "output_code": output_code,
        "costs_cop": cost,
        "sale_price_cop_per_unit": sale_price,
    })
    assert transformation.status_code == 201, transformation.text
    return reception.json(), transformation.json()


def test_balance_economico_usa_costos_de_etapa_y_ejemplo_oficial(api):
    _, transformation = _receive_and_transform(api)

    response = api["client"].get(
        f"/api/v1/economics/{transformation['id']}",
        headers=auth(api["admin_token"]),
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["total_cost_cop"] == 1600000
    assert result["unit_cost_cop"] == 20000
    assert result["margin_on_sale_percent"] == 20
    assert result["formula"]
    assert result["included_costs"] == ["Costos de procesamiento de la etapa"]
    assert "compra" not in " ".join(result["included_costs"])


def test_balance_economico_no_divide_por_cero(api):
    _, transformation = _receive_and_transform(api, cost=1000, output_code="ZERO-OUTPUT", output_quantity=0)

    response = api["client"].get(
        f"/api/v1/economics/{transformation['id']}",
        headers=auth(api["admin_token"]),
    )

    assert response.status_code == 200, response.text
    assert response.json()["unit_cost_cop"] is None
    assert response.json()["margin_on_sale_percent"] is None

    _, zero_price = _receive_and_transform(api, cost=1000, output_code="ZERO-SALE", sale_price=0)
    response = api["client"].get(
        f"/api/v1/economics/{zero_price['id']}", headers=auth(api["admin_token"])
    )
    assert response.status_code == 200, response.text
    assert response.json()["unit_cost_cop"] == 12.5
    assert response.json()["margin_on_sale_percent"] is None


def test_exportacion_csv_filtra_y_muestra_costos_por_lote(api):
    reception, transformation = _receive_and_transform(api)
    admin_headers = auth(api["admin_token"])

    response = api["client"].get(
        "/api/v1/exports/lots.csv?origin=Huila&status=pending",
        headers=admin_headers,
    )

    assert response.status_code == 200, response.text
    rows = list(csv.DictReader(StringIO(response.text)))
    assert {"identificador", "origen", "recibido", "consumido", "disponible", "estado", "costos_COP"}.issubset(rows[0])
    by_code = {row["identificador"]: row for row in rows}
    raw_code = reception["lot_code"]
    output_code = transformation["outputs"][0]["lot_code"]
    assert float(by_code[raw_code]["costos_COP"]) == 1200000
    assert float(by_code[output_code]["costos_COP"]) == 1600000

    inventory = api["client"].get("/api/v1/inventory/admin?origin=Hui&status=pending", headers=admin_headers)
    assert inventory.status_code == 200
    inventory_by_code = {row["code"]: row for row in inventory.json()}
    assert inventory_by_code[raw_code]["costs_cop"] == 1200000
    assert inventory_by_code[output_code]["costs_cop"] == 1600000

    forbidden = api["client"].get("/api/v1/exports/lots.csv", headers=auth(api["operator_token"]))
    assert forbidden.status_code == 403
    forbidden_inventory = api["client"].get("/api/v1/inventory/admin", headers=auth(api["operator_token"]))
    assert forbidden_inventory.status_code == 403


def test_auditoria_guarda_valores_antes_despues_y_es_solo_insercion_en_orm(api):
    reception, _ = _receive_and_transform(api, output_code="AUDIT-OUTPUT")
    lot_id = reception["lot_id"]
    response = api["client"].patch(
        f"/api/v1/lots/{lot_id}/status",
        headers=auth(api["admin_token"]),
        json={"status": "blocked", "reason": "Incidencia de calidad"},
    )
    assert response.status_code == 200, response.text
    audit_response = api["client"].get(
        f"/api/v1/lots/{lot_id}/audit", headers=auth(api["admin_token"])
    )
    assert audit_response.status_code == 200, audit_response.text
    assert any(event["entity_type"] == "transformation" for event in audit_response.json())
    assert all(event["actor_name"] for event in audit_response.json())

    with api["session_factory"]() as db:
        event = (db.query(AuditEvent)
                 .filter_by(entity_type="lot", entity_id=str(lot_id), action="status_changed")
                 .one())
        assert event.actor_id is not None
        assert event.created_at is not None
        assert event.before_value == {"status": "pending", "reason": None}
        assert event.after_value == {"status": "blocked", "reason": "Incidencia de calidad"}
        transform_event = db.query(AuditEvent).filter_by(
            entity_type="transformation", action="created"
        ).one()
        assert transform_event.before_value is None
        assert transform_event.after_value["processing_cost_cop"] == "1600000.00"
        event.after_value = {"status": "released"}
        with pytest.raises(ValueError, match="inmutables"):
            db.commit()
        db.rollback()

        event = db.get(AuditEvent, event.id)
        db.delete(event)
        with pytest.raises(ValueError, match="inmutables"):
            db.commit()
