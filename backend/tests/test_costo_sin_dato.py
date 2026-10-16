"""Un costo de etapa que no se registró es «sin dato», no «0»: el costo unitario no es calculable y se alerta."""
from datetime import datetime, timezone
from uuid import uuid4

from app.models import CostEntry
from conftest import auth
from test_recepcion_lote import reception_payload


def _recibir(api) -> int:
    r = api["client"].post("/api/v1/receptions", headers=auth(api["operator_token"]), json=reception_payload(api["farm_id"]))
    assert r.status_code == 201, r.text
    return r.json()["lot_id"]


def _transformar(api, lot_id: int, codigo: str, clave: str | None = None, **extra):
    cuerpo = {
        "idempotency_key": clave or str(uuid4()), "lot_id": lot_id, "stage": "secado",
        "occurred_at": "2026-01-10T12:00:00+00:00", "input_quantity": 100, "output_quantity": 80,
        "unit": "kg", "output_code": codigo, "sale_price_cop_per_unit": 25000, **extra,
    }
    return api["client"].post("/api/v1/transformations", headers=auth(api["operator_token"]), json=cuerpo)


def _economia(api, codigo: str) -> dict:
    r = api["client"].get("/api/v1/economics", headers=auth(api["admin_token"]))
    assert r.status_code == 200, r.text
    return next(e for e in r.json() if e["output_code"] == codigo)


def _alertas(api, codigo: str, tipo: str) -> list[dict]:
    r = api["client"].get("/api/v1/alerts", headers=auth(api["admin_token"]))
    return [a for a in r.json() if a["type"] == tipo and a["entity"] == codigo]


def _entradas_de_costo(api) -> int:
    with api["session_factory"]() as db:
        return db.query(CostEntry).filter_by(category="processing").count()


def test_sin_costo_no_hay_costo_unitario_ni_margen(api):
    t = _transformar(api, _recibir(api), "SIN-COSTO")
    assert t.status_code == 201, t.text
    e = _economia(api, "SIN-COSTO")
    assert e["unit_cost_cop"] is None and e["margin_on_sale_percent"] is None
    assert _entradas_de_costo(api) == 0


def test_sin_costo_se_alerta_registro_incompleto(api):
    _transformar(api, _recibir(api), "SIN-COSTO-ALERTA")
    a = _alertas(api, "SIN-COSTO-ALERTA", "registro_incompleto")
    assert len(a) == 1 and "costo" in a[0]["cause"]


def test_un_costo_de_cero_registrado_cuenta_como_dato(api):
    t = _transformar(api, _recibir(api), "COSTO-CERO", costs_cop=0)
    assert t.status_code == 201, t.text
    e = _economia(api, "COSTO-CERO")
    assert e["unit_cost_cop"] == 0 and e["margin_on_sale_percent"] == 100
    assert _alertas(api, "COSTO-CERO", "registro_incompleto") == []


def test_el_ejemplo_del_reto_sigue_dando_20000_y_20_por_ciento(api):
    _transformar(api, _recibir(api), "EJEMPLO", costs_cop=1_600_000)
    e = _economia(api, "EJEMPLO")
    assert e["unit_cost_cop"] == 20000 and e["margin_on_sale_percent"] == 20


def test_reenviar_la_misma_operacion_sin_costo_devuelve_lo_mismo_y_no_da_409(api):
    lot_id, clave = _recibir(api), str(uuid4())
    primera = _transformar(api, lot_id, "REENVIO-SIN-COSTO", clave=clave)
    segunda = _transformar(api, lot_id, "REENVIO-SIN-COSTO", clave=clave)
    assert primera.status_code == 201 and segunda.status_code == 201, segunda.text
    assert segunda.json()["id"] == primera.json()["id"]


def test_la_misma_clave_con_costo_omitido_y_con_costo_cero_son_operaciones_distintas(api):
    lot_id, clave = _recibir(api), str(uuid4())
    assert _transformar(api, lot_id, "DISTINTAS", clave=clave).status_code == 201
    assert _transformar(api, lot_id, "DISTINTAS", clave=clave, costs_cop=0).status_code == 409


def test_costo_negativo_sigue_rechazado(api):
    assert _transformar(api, _recibir(api), "NEGATIVO", costs_cop=-1).status_code == 422
