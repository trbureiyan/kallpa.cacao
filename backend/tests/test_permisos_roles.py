from datetime import datetime, timezone
from uuid import uuid4

from conftest import auth
from test_recepcion_lote import reception_payload


def test_operador_no_puede_alterar_estado_de_producto(api):
    client = api["client"]
    operator_headers = auth(api["operator_token"])
    reception = client.post("/api/v1/receptions", json=reception_payload(api["farm_id"]), headers=operator_headers)
    transform = client.post("/api/v1/transformations", headers=operator_headers, json={
        "idempotency_key": str(uuid4()),
        "lot_id": reception.json()["lot_id"],
        "stage": "secado",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "input_quantity": 100,
        "output_quantity": 80,
        "unit": "kg",
        "output_code": "PROD-ROLE-TEST",
        "costs_cop": 0,
    })
    assert transform.status_code == 201

    response = client.patch("/api/v1/lots/products/PROD-ROLE-TEST/status", headers=operator_headers,
                            json={"status": "blocked", "reason": "Prueba de permiso"})
    assert response.status_code == 403

    admin_response = client.patch("/api/v1/lots/products/PROD-ROLE-TEST/status",
                                  headers=auth(api["admin_token"]),
                                  json={"status": "blocked", "reason": "Prueba de administrador"})
    assert admin_response.status_code == 200
    output_lot_id = transform.json()["outputs"][0]["lot_id"]
    public_product = client.get("/api/v1/public/products/PROD-ROLE-TEST")
    assert public_product.status_code == 200
    assert public_product.json()["status"] == "blocked"
    assert public_product.json()["availability"] == "not_available"
    blocked_product_transform = client.post("/api/v1/transformations", headers=operator_headers, json={
        "idempotency_key": str(uuid4()),
        "lot_id": output_lot_id,
        "stage": "molienda",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "input_quantity": 20,
        "output_quantity": 18,
        "unit": "kg",
        "output_code": "MUST-NOT-PROCESS-BLOCKED",
        "costs_cop": 0,
    })
    assert blocked_product_transform.status_code == 409


def test_admin_puede_bloquear_materia_prima_y_se_impide_consumirla(api):
    client = api["client"]
    operator_headers = auth(api["operator_token"])
    admin_headers = auth(api["admin_token"])
    reception = client.post("/api/v1/receptions", json=reception_payload(api["farm_id"]), headers=operator_headers)
    lot_id = reception.json()["lot_id"]

    operator_attempt = client.patch(f"/api/v1/lots/{lot_id}/status", headers=operator_headers,
                                    json={"status": "blocked", "reason": "No autorizado"})
    assert operator_attempt.status_code == 403
    blocked = client.patch(f"/api/v1/lots/{lot_id}/status", headers=admin_headers,
                           json={"status": "blocked", "reason": "Lote en revisión sanitaria"})
    assert blocked.status_code == 200
    assert blocked.json()["status"] == "blocked"

    transform = client.post("/api/v1/transformations", headers=operator_headers, json={
        "idempotency_key": str(uuid4()),
        "lot_id": lot_id,
        "stage": "secado",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "input_quantity": 10,
        "output_quantity": 8,
        "unit": "kg",
        "output_code": "MUST-NOT-CONSUME-RAW",
        "costs_cop": 0,
    })
    assert transform.status_code == 409
