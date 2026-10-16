"""El CSV lo abre el administrador en una hoja de cálculo: el texto que empieza como fórmula no debe ejecutarse."""
import csv
from io import StringIO

import pytest

from app.models import Farm, Producer
from conftest import auth
from test_recepcion_lote import reception_payload


def _lote_con_origen(api, region: str) -> str:
    """Crea una finca cuya región es `region`, recibe un lote allí y devuelve su código."""
    with api["session_factory"]() as db:
        productor = Producer(code=f"P-{abs(hash(region)) % 10_000}", name="Productor de prueba")
        db.add(productor)
        db.flush()
        finca = Farm(producer_id=productor.id, name="Finca con región especial", region=region)
        db.add(finca)
        db.commit()
        finca_id = finca.id
    r = api["client"].post("/api/v1/receptions", headers=auth(api["operator_token"]), json=reception_payload(finca_id))
    assert r.status_code == 201, r.text
    return r.json()["lot_code"]


def _filas(api) -> dict[str, dict]:
    r = api["client"].get("/api/v1/exports/lots.csv", headers=auth(api["admin_token"]))
    assert r.status_code == 200, r.text
    return {f["identificador"]: f for f in csv.DictReader(StringIO(r.text))}


@pytest.mark.parametrize("region", ['=HYPERLINK("http://malo.example","clic")', "+1+1", "-2+3", "@SUM(A1)", "\tcmd", "\n=cmd"])
def test_un_origen_que_parece_formula_sale_neutralizado(api, region):
    codigo = _lote_con_origen(api, region)
    origen = _filas(api)[codigo]["origen"]
    assert origen == "'" + region
    assert not origen.startswith(("=", "+", "-", "@", "\t", "\r", "\n"))


def test_un_origen_normal_no_se_altera(api):
    codigo = _lote_con_origen(api, "Rivera")
    assert _filas(api)[codigo]["origen"] == "Rivera"


def test_las_columnas_numericas_no_se_tocan(api):
    codigo = _lote_con_origen(api, "Rivera")
    fila = _filas(api)[codigo]
    assert float(fila["recibido"]) == 100 and float(fila["disponible"]) == 100
    assert not fila["recibido"].startswith("'")


def test_el_codigo_del_lote_tambien_se_neutraliza(api):
    # el código lo genera el servidor (CACxxx) y la API ya rechaza códigos de salida fuera de formato; el CSV
    # neutraliza igual por si un código llega a la base por otra vía (importación, migración, edición manual)
    from datetime import datetime, timezone
    from uuid import uuid4

    codigo = _lote_con_origen(api, "Rivera")
    lot_id = api["client"].get("/api/v1/inventory", headers=auth(api["operator_token"])).json()[0]["lot_id"]
    t = api["client"].post("/api/v1/transformations", headers=auth(api["operator_token"]), json={
        "idempotency_key": str(uuid4()), "lot_id": lot_id, "stage": "secado", "occurred_at": datetime.now(timezone.utc).isoformat(),
        "input_quantity": 100, "output_quantity": 80, "unit": "kg", "output_code": "SALIDA-1", "costs_cop": 1,
    })
    assert t.status_code == 201, t.text
    from app.models import Lot
    with api["session_factory"]() as db:
        db.query(Lot).filter_by(code="SALIDA-1").update({"code": "=CMD()|' /C calc'!A0"})
        db.commit()
    codigos = _filas(api).keys()
    assert "'=CMD()|' /C calc'!A0" in codigos
    assert not any(c.startswith("=") for c in codigos)
    assert codigo in codigos
