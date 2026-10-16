from datetime import datetime, timezone
from uuid import uuid4

from app.models import Lot, Transformation

from conftest import auth
from test_recepcion_lote import reception_payload


def test_calcula_merma_y_alerta_solo_si_supera_15_por_ciento(api):
    client = api["client"]
    headers = auth(api["operator_token"])
    reception = client.post("/api/v1/receptions", json=reception_payload(api["farm_id"]), headers=headers)
    lot_id = reception.json()["lot_id"]
    second_reception = client.post("/api/v1/receptions", json=reception_payload(api["farm_id"]), headers=headers)
    second_lot_id = second_reception.json()["lot_id"]

    for code, output, input_lot_id in (("PROD-LOSS-20", 80, lot_id), ("PROD-LOSS-15", 85, second_lot_id)):
        response = client.post("/api/v1/transformations", headers=headers, json={
            "idempotency_key": str(uuid4()),
            "lot_id": input_lot_id,
            "stage": "secado",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "input_quantity": 100,
            "output_quantity": output,
            "unit": "kg",
            "output_code": code,
            "costs_cop": 0,
        })
        assert response.status_code == 201

    alerts = client.get("/api/v1/alerts", headers=auth(api["admin_token"]))
    assert alerts.status_code == 200
    loss_alerts = [alert for alert in alerts.json() if alert["type"] == "merma"]
    assert [(item["entity"], item["value_percent"]) for item in loss_alerts] == [("PROD-LOSS-20", 20.0)]

    with api["session_factory"]() as db:
        assert db.query(Transformation).count() == 2
        lot = db.get(Lot, lot_id)
        assert float(lot.available_quantity) == 0
