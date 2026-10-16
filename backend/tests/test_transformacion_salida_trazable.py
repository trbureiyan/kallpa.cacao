from datetime import datetime, timezone
from uuid import uuid4

from app.models import AuditEvent, CostEntry, InventoryMovement, Lot, Transformation, TransformationOutput

from conftest import auth
from test_recepcion_lote import reception_payload


def test_recepcion_transformacion_salida_movimientos_merma_y_linaje(api):
    client = api["client"]
    headers = auth(api["operator_token"])
    reception = client.post(
        "/api/v1/receptions",
        json=reception_payload(api["farm_id"], quantity="100.000"),
        headers=headers,
    )
    assert reception.status_code == 201, reception.text
    input_lot_id = reception.json()["lot_id"]

    transformation_request = {
        "idempotency_key": str(uuid4()),
        "lot_id": input_lot_id,
        "stage": "secado",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "input_quantity": 100,
        "output_quantity": 80,
        "unit": "kg",
        "output_code": "DRY-TRACE-001",
        "product_type": "dried_cocoa",
        "costs_cop": 200000,
    }
    transformed = client.post("/api/v1/transformations", headers=headers, json=transformation_request)
    assert transformed.status_code == 201, transformed.text
    payload = transformed.json()
    retry = client.post("/api/v1/transformations", headers=headers, json=transformation_request)
    assert retry.status_code == 201
    assert retry.json()["id"] == payload["id"]
    assert retry.json()["outputs"] == payload["outputs"]
    changed_replay = client.post("/api/v1/transformations", headers=headers,
                                 json={**transformation_request, "stage": "tostado"})
    assert changed_replay.status_code == 409
    assert payload["outputs"] == [{
        "lot_id": payload["outputs"][0]["lot_id"],
        "lot_code": "DRY-TRACE-001",
        "product_type": "dried_cocoa",
        "quantity": 80.0,
        "unit": "kg",
        "status": "pending",
    }]
    output_lot_id = payload["outputs"][0]["lot_id"]

    input_lot = client.get(f"/api/v1/lots/{input_lot_id}", headers=headers).json()
    output_lot = client.get(f"/api/v1/lots/{output_lot_id}", headers=headers).json()
    assert float(input_lot["available_quantity"]) == 0
    assert float(input_lot["consumed_quantity"]) == 100
    assert output_lot["code"] == "DRY-TRACE-001"
    assert output_lot["product_type"] == "dried_cocoa"
    assert float(output_lot["available_quantity"]) == 80
    assert float(output_lot["received_quantity"]) == 80

    input_movements = client.get(f"/api/v1/lots/{input_lot_id}/movements", headers=headers).json()
    output_movements = client.get(f"/api/v1/lots/{output_lot_id}/movements", headers=headers).json()
    assert any(move["movement_type"] == "consumption" and float(move["quantity"]) == 100 for move in input_movements)
    assert len(output_movements) == 1
    assert output_movements[0]["movement_type"] == "production"
    assert float(output_movements[0]["quantity"]) == 80

    input_trace = client.get(f"/api/v1/lots/{input_lot_id}/traceability", headers=headers).json()
    output_trace = client.get(f"/api/v1/lots/{output_lot_id}/traceability", headers=headers).json()
    assert any(edge["outputs"][0]["lot"]["code"] == "DRY-TRACE-001"
               for edge in input_trace["downstream_transformations"])
    assert any(edge["input_lot"]["id"] == input_lot_id
               for edge in output_trace["upstream_transformations"])
    assert output_trace["origin_lots"][0]["lot"]["code"] == input_lot["code"]
    assert output_trace["origin_lots"][0]["producer"]["id"] == input_lot["producer_id"]

    public_product = client.get("/api/v1/public/products/DRY-TRACE-001")
    assert public_product.status_code == 200
    assert public_product.json()["product_type"] == "dried_cocoa"
    assert public_product.json()["origin"] == input_lot["origin"]
    assert "costs_cop" not in public_product.json()

    alerts = client.get("/api/v1/alerts", headers=auth(api["admin_token"])).json()
    loss = next(item for item in alerts if item["entity"] == "DRY-TRACE-001")
    assert loss["value_percent"] == 20

    with api["session_factory"]() as db:
        transform = db.get(Transformation, payload["id"])
        assert transform.output_code is None
        assert "output_quantity" not in Transformation.__table__.c
        assert "output_status" not in Transformation.__table__.c
        assert "status_reason" not in Transformation.__table__.c
        assert "quantity" not in TransformationOutput.__table__.c
        assert db.query(TransformationOutput).filter_by(transformation_id=transform.id, lot_id=output_lot_id).count() == 1
        assert db.query(InventoryMovement).filter_by(transformation_id=transform.id).count() == 2
        assert db.get(Lot, output_lot_id).origin == db.get(Lot, input_lot_id).origin


def test_falla_al_crear_salida_y_revierte_consumo_de_entrada(api):
    client = api["client"]
    headers = auth(api["operator_token"])
    reception = client.post("/api/v1/receptions", json=reception_payload(api["farm_id"]), headers=headers)
    lot_id = reception.json()["lot_id"]
    input_lot_code = reception.json()["lot_code"]
    base = {
        "lot_id": lot_id,
        "stage": "secado",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "input_quantity": 100,
        "output_quantity": 80,
        "unit": "kg",
        "output_code": "DUPLICATE-OUTPUT",
        "costs_cop": 200000,
    }
    first = client.post("/api/v1/transformations", headers=headers,
                        json={**base, "idempotency_key": str(uuid4())})
    assert first.status_code == 201, first.text
    second = client.post("/api/v1/transformations", headers=headers,
                         json={**base, "output_code": input_lot_code, "idempotency_key": str(uuid4())})
    assert second.status_code == 409
    lot = client.get(f"/api/v1/lots/{lot_id}", headers=headers).json()
    assert float(lot["available_quantity"]) == 0
    assert float(lot["consumed_quantity"]) == 100
    with api["session_factory"]() as db:
        assert db.query(Transformation).count() == 1
        assert db.query(InventoryMovement).filter_by(lot_id=lot_id, movement_type="consumption").count() == 1


def test_consumo_mayor_al_disponible_no_deja_registros_parciales(api):
    client = api["client"]
    headers = auth(api["operator_token"])
    reception = client.post("/api/v1/receptions", json=reception_payload(api["farm_id"]), headers=headers)
    lot_id = reception.json()["lot_id"]
    with api["session_factory"]() as db:
        before = {
            "transformations": db.query(Transformation).count(),
            "movements": db.query(InventoryMovement).count(),
            "cost_entries": db.query(CostEntry).filter(CostEntry.transformation_id.is_not(None)).count(),
            "audit": db.query(AuditEvent).count(),
            "lots": db.query(Lot).count(),
        }
    response = client.post("/api/v1/transformations", headers=headers, json={
        "idempotency_key": str(uuid4()),
        "lot_id": lot_id,
        "stage": "secado",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "input_quantity": 101,
        "output_quantity": 80,
        "unit": "kg",
        "output_code": "MUST-NOT-EXIST",
        "costs_cop": 50000,
    })
    assert response.status_code == 409
    with api["session_factory"]() as db:
        assert db.query(Transformation).count() == before["transformations"]
        assert db.query(InventoryMovement).count() == before["movements"]
        assert db.query(CostEntry).filter(CostEntry.transformation_id.is_not(None)).count() == before["cost_entries"]
        assert db.query(AuditEvent).count() == before["audit"]
        assert db.query(Lot).count() == before["lots"]
        assert float(db.get(Lot, lot_id).available_quantity) == 100


def test_una_transformacion_puede_vincular_varios_lotes_de_salida(api):
    client = api["client"]
    headers = auth(api["operator_token"])
    reception = client.post("/api/v1/receptions", json=reception_payload(api["farm_id"]), headers=headers)
    input_lot_id = reception.json()["lot_id"]
    response = client.post("/api/v1/transformations", headers=headers, json={
        "idempotency_key": str(uuid4()),
        "lot_id": input_lot_id,
        "stage": "clasificacion",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "input_quantity": 100,
        "unit": "kg",
        "outputs": [
            {"lot_code": "CLAS-A", "product_type": "cocoa_nibs", "quantity": 50, "unit": "kg"},
            {"lot_code": "CLAS-B", "product_type": "cocoa_shell", "quantity": 30, "unit": "kg"},
        ],
        "costs_cop": 200000,
    })
    assert response.status_code == 201, response.text
    result = response.json()
    assert result["output_quantity"] == 80
    assert {item["lot_code"] for item in result["outputs"]} == {"CLAS-A", "CLAS-B"}
    with api["session_factory"]() as db:
        allocations = {
            (entry.category, float(entry.amount_cop))
            for entry in db.query(CostEntry).filter(CostEntry.transformation_id == result["id"]).all()
        }
        assert allocations == {("processing", 125000.0), ("processing", 75000.0)}
    trace = client.get(f"/api/v1/lots/{input_lot_id}/traceability", headers=headers).json()
    assert {item["lot"]["code"] for item in trace["downstream_transformations"][0]["outputs"]} == {"CLAS-A", "CLAS-B"}
    for code in ("CLAS-A", "CLAS-B"):
        public = client.get(f"/api/v1/public/products/{code}")
        assert public.status_code == 200
