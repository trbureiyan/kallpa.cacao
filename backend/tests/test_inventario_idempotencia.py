from app.models import InventoryMovement, Lot, Reception

from conftest import auth
from test_recepcion_lote import reception_payload


def test_reintento_de_recepcion_offline_no_duplica_lote_ni_movimiento(api):
    # Simula la sincronización y reintento de una captura guardada en IndexedDB:
    # el backend recibe exactamente la misma clave y payload al recuperar la red.
    payload = reception_payload(api["farm_id"])
    headers = auth(api["operator_token"])
    first = api["client"].post("/api/v1/receptions", json=payload, headers=headers)
    retry = api["client"].post("/api/v1/receptions", json=payload, headers=headers)

    assert first.status_code == 201
    assert retry.status_code == 201
    assert retry.json() == first.json()
    with api["session_factory"]() as db:
        assert db.query(Lot).count() == 1
        assert db.query(Reception).count() == 1
        assert db.query(InventoryMovement).count() == 1


def test_reutilizar_clave_con_payload_distinto_da_conflicto(api):
    payload = reception_payload(api["farm_id"])
    headers = auth(api["operator_token"])
    assert api["client"].post("/api/v1/receptions", json=payload, headers=headers).status_code == 201
    payload["quantity_kg"] = "99.000"
    response = api["client"].post("/api/v1/receptions", json=payload, headers=headers)
    assert response.status_code == 409
