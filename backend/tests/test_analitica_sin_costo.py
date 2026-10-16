"""Una etapa sin costo registrado no tiene margen calculable: el panel no debe mostrarla con margen 100 %."""
from conftest import auth
from test_costo_sin_dato import _recibir, _transformar


def test_etapa_sin_costo_no_aparece_con_margen(api):
    lot_id = _recibir(api)
    assert _transformar(api, lot_id, "SIN-COSTO-1").status_code == 201  # sin costs_cop, con precio de venta
    r = api["client"].get("/api/v1/analytics/dashboard", headers=auth(api["admin_token"]))
    assert r.status_code == 200, r.text
    assert [m for m in r.json()["lowest_margins"] if m["lot_code"] == "SIN-COSTO-1"] == []


def test_etapa_con_costo_si_tiene_margen(api):
    lot_id = _recibir(api)
    assert _transformar(api, lot_id, "CON-COSTO-1", costs_cop=1600000).status_code == 201
    r = api["client"].get("/api/v1/analytics/dashboard", headers=auth(api["admin_token"]))
    fila = next(m for m in r.json()["lowest_margins"] if m["lot_code"] == "CON-COSTO-1")
    assert round(fila["margin_on_sale_percent"], 2) == 20.0
