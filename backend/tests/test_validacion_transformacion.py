"""El esquema de la transformación rechaza números no finitos, precisión de más, cifras fuera de cota y códigos con basura."""
import json
from uuid import uuid4

import pytest

from conftest import auth
from test_costo_sin_dato import _recibir


def _cuerpo(lot_id: int, **cambios) -> dict:
    return {
        "idempotency_key": str(uuid4()), "lot_id": lot_id, "stage": "secado",
        "occurred_at": "2026-01-10T12:00:00+00:00", "input_quantity": 100, "output_quantity": 80,
        "unit": "kg", "output_code": f"CAC900-{uuid4().hex[:6].upper()}", **cambios,
    }


def _enviar_crudo(api, texto: str):
    # json.dumps no escribe NaN por defecto en otros clientes; aquí se manda el literal tal cual llegaría
    return api["client"].post("/api/v1/transformations", headers={**auth(api["operator_token"]), "Content-Type": "application/json"},
                              content=texto)


@pytest.mark.parametrize("literal", ["NaN", "Infinity", "-Infinity"])
@pytest.mark.parametrize("campo", ["input_quantity", "output_quantity", "costs_cop", "sale_price_cop_per_unit"])
def test_rechaza_numeros_no_finitos(api, campo, literal):
    lot_id = _recibir(api)
    texto = json.dumps(_cuerpo(lot_id, **{campo: 12345.5})).replace("12345.5", literal)
    r = _enviar_crudo(api, texto)
    assert r.status_code == 422, r.text


@pytest.mark.parametrize("cambio", [
    {"input_quantity": 10.1234},                 # kg con 4 decimales
    {"output_quantity": 8.0001},
    {"costs_cop": 1000.123},                     # COP con 3 decimales
    {"sale_price_cop_per_unit": 25000.555},
    {"input_quantity": 10**12},                   # fuera de cota
    {"costs_cop": 10**15},
    {"sale_price_cop_per_unit": 10**12},
    {"output_code": "cac001 x"},
    {"output_code": "CAC001´¨P[RTG"},
    {"output_code": "-CAC001"},
    {"incident": "x" * 1001},
])
def test_rechaza_valores_fuera_de_dominio(api, cambio):
    lot_id = _recibir(api)
    r = api["client"].post("/api/v1/transformations", headers=auth(api["operator_token"]), json=_cuerpo(lot_id, **cambio))
    assert r.status_code == 422, r.text


def test_la_respuesta_422_no_devuelve_el_valor_recibido(api):
    lot_id = _recibir(api)
    r = _enviar_crudo(api, json.dumps(_cuerpo(lot_id, input_quantity=12345.5)).replace("12345.5", "NaN"))
    assert r.status_code == 422
    assert r.json()["detail"][0]["loc"] == ["body", "input_quantity"]
    assert "input" not in r.json()["detail"][0]


def test_acepta_valores_validos_en_el_limite_de_precision(api):
    lot_id = _recibir(api)
    r = api["client"].post("/api/v1/transformations", headers=auth(api["operator_token"]),
                           json=_cuerpo(lot_id, input_quantity=10.125, output_quantity=8.5, costs_cop=1600000.25,
                                        sale_price_cop_per_unit=25000.5))
    assert r.status_code == 201, r.text


def test_recepcion_limita_notas_de_calidad(api):
    from test_recepcion_lote import reception_payload
    cuerpo = {**reception_payload(api["farm_id"]), "quality_notes": "x" * 501}
    r = api["client"].post("/api/v1/receptions", headers=auth(api["operator_token"]), json=cuerpo)
    assert r.status_code == 422, r.text
