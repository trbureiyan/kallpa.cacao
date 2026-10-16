from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.models import InventoryMovement, Lot, Reception

from conftest import auth


def reception_payload(farm_id: int, quantity: str = "100.000") -> dict:
    return {
        "idempotency_key": str(uuid4()),
        "farm_id": farm_id,
        "received_at": datetime.now(timezone.utc).isoformat(),
        "quantity_kg": quantity,
        "purchase_total_cop": "1200000.00",
        "quality_notes": "Prueba de recepción",
    }


def test_recepcion_crea_lote_origen_saldo_y_movimiento(api):
    response = api["client"].post(
        "/api/v1/receptions",
        json=reception_payload(api["farm_id"]),
        headers=auth(api["operator_token"]),
    )

    assert response.status_code == 201
    result = response.json()
    assert result["lot_code"].startswith("CAC")
    assert result["available_quantity_kg"] == "100.000"
    assert result["farm_id"] == api["farm_id"]
    with api["session_factory"]() as db:
        assert db.query(Lot).count() == 1
        assert db.query(Reception).count() == 1
        movement = db.query(InventoryMovement).one()
        assert movement.movement_type == "reception"
        assert str(movement.quantity) == "100.000"


@pytest.mark.parametrize("quantity", ["0", "-1", "-0.001"])
def test_rechaza_cantidad_no_positiva(api, quantity):
    response = api["client"].post(
        "/api/v1/receptions",
        json=reception_payload(api["farm_id"], quantity),
        headers=auth(api["operator_token"]),
    )
    assert response.status_code == 422
