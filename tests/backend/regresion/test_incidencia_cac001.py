"""REG-001 · Incidencia técnica común de la hora 12: el comprador informa un problema con CAC001.

El administrador debe bloquear el producto, identificar su origen y explicar las cantidades afectadas, sin borrar historial
(reto, sección 4). Bloquear es un cambio de estado auditado, nunca un borrado.

Corre contra la API real con una base en memoria. Desde la raíz: python -m pytest tests/backend/regresion -q
"""
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "backend"))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Farm, Producer, User  # noqa: E402
from app.security.authentication import create_access_token  # noqa: E402

MOTIVO = "Reclamo del comprador sobre la humedad del lote"


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def api():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Sesion = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    with Sesion() as db:
        operador = User(username="operador", full_name="Operador", password_hash="x", role="operator")
        admin = User(username="admin", full_name="Administrador", password_hash="x", role="admin")
        productor = Producer(code="PROD-A", name="Productor A")
        db.add_all([operador, admin, productor])
        db.flush()
        finca = Farm(producer_id=productor.id, name="Finca A", region="Rivera")
        db.add(finca)
        db.commit()
        ids = (operador.id, admin.id, finca.id)

    def sesion_de_prueba():
        with Sesion() as db:
            yield db

    app.dependency_overrides[get_db] = sesion_de_prueba
    cliente = TestClient(app)  # sin `with`: no dispara el sembrado de demostración
    try:
        yield {
            "c": cliente,
            "finca": ids[2],
            "op": _auth(create_access_token(User(id=ids[0], username="operador", full_name="O", password_hash="", role="operator"))),
            "adm": _auth(create_access_token(User(id=ids[1], username="admin", full_name="A", password_hash="", role="admin"))),
        }
    finally:
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture
def escenario(api):
    """CAC001: 100 kg recibidos en Rivera, transformados a 80 kg de producto y liberados para la venta."""
    c = api["c"]
    r = c.post("/api/v1/receptions", headers=api["op"], json={
        "idempotency_key": str(uuid4()), "farm_id": api["finca"], "received_at": datetime.now(timezone.utc).isoformat(),
        "quantity_kg": 100, "purchase_total_cop": 1_200_000,
    })
    assert r.status_code == 201, r.text
    lote = r.json()
    assert lote["lot_code"] == "CAC001"  # primer lote de una base limpia, como en la demostración
    t = c.post("/api/v1/transformations", headers=api["op"], json={
        "idempotency_key": str(uuid4()), "lot_id": lote["lot_id"], "stage": "secado", "occurred_at": datetime.now(timezone.utc).isoformat(),
        "input_quantity": 100, "output_quantity": 80, "unit": "kg", "output_code": "CAC001-P1",
        "costs_cop": 1_600_000, "sale_price_cop_per_unit": 25_000,
    })
    assert t.status_code == 201, t.text
    producto_id = t.json()["outputs"][0]["lot_id"]
    liberado = c.patch(f"/api/v1/lots/{producto_id}/status", headers=api["adm"], json={"status": "released", "reason": "Cumple calidad"})
    assert liberado.status_code == 200, liberado.text
    return {**api, "lote_id": lote["lot_id"], "producto_id": producto_id}


def _bloquear(e, lot_id: int, motivo: str = MOTIVO):
    return e["c"].patch(f"/api/v1/lots/{lot_id}/status", headers=e["adm"], json={"status": "blocked", "reason": motivo})


def test_bloquear_cac001_deja_la_ficha_publica_en_bloqueado_con_su_origen(escenario):
    e = escenario
    assert _bloquear(e, e["lote_id"]).status_code == 200

    ficha = e["c"].get("/api/v1/public/products/CAC001")  # sin sesión: es lo que ve el comprador
    assert ficha.status_code == 200, ficha.text
    f = ficha.json()
    assert f["status"] == "blocked" and f["availability"] == "not_available"
    assert f["status_reason"] == MOTIVO
    assert f["origin"] == "Rivera"
    # lo que ve el comprador nunca incluye costos ni datos del productor
    texto = ficha.text.lower()
    for prohibido in ("1200000", "1600000", "25000", "costs", "producer", "contact", "productor a"):
        assert prohibido not in texto

    # comportamiento actual, pendiente de decisión del equipo (marco §8): bloquear el lote de origen NO bloquea por sí solo
    # el producto derivado. Si se decide propagar el bloqueo, esta aserción debe cambiar junto con el código.
    derivado = e["c"].get("/api/v1/public/products/CAC001-P1").json()
    assert derivado["status"] == "released" and derivado["availability"] == "available"


def test_el_origen_y_las_cantidades_afectadas_se_pueden_explicar(escenario):
    e = escenario
    _bloquear(e, e["lote_id"])

    traza = e["c"].get(f"/api/v1/lots/{e['lote_id']}/traceability", headers=e["adm"]).json()
    origen = traza["origin_lots"][0]
    assert origen["lot"]["code"] == "CAC001" and origen["lot"]["origin"] == "Rivera"
    assert origen["producer"]["name"] == "Productor A"

    etapa = traza["downstream_transformations"][0]
    assert float(etapa["transformation"]["input_quantity"]) == 100
    assert [o["lot"]["code"] for o in etapa["outputs"]] == ["CAC001-P1"]
    assert sum(float(o["quantity"]) for o in etapa["outputs"]) == 80

    fila = next(f for f in e["c"].get("/api/v1/inventory/admin", headers=e["adm"]).json() if f["code"] == "CAC001")
    # cantidades afectadas: 100 kg recibidos, todos consumidos, 0 kg sin transformar
    assert (float(fila["received_quantity"]), float(fila["consumed_quantity"]), float(fila["available_quantity"])) == (100, 100, 0)
    assert fila["status"] == "blocked" and fila["status_reason"] == MOTIVO


def test_el_bloqueo_no_borra_ni_modifica_el_historial(escenario):
    e = escenario
    auditoria_antes = e["c"].get("/api/v1/audit", headers=e["adm"]).json()
    movimientos_antes = e["c"].get("/api/v1/inventory/movements", headers=e["adm"]).json()
    lotes_antes = {f["lot_code"] for f in e["c"].get("/api/v1/inventory", headers=e["adm"]).json()}

    assert _bloquear(e, e["lote_id"]).status_code == 200

    auditoria = e["c"].get("/api/v1/audit", headers=e["adm"]).json()
    ids_antes = {ev["id"] for ev in auditoria_antes}
    assert ids_antes <= {ev["id"] for ev in auditoria}, "el bloqueo no puede quitar eventos de auditoría"
    nuevos = [ev for ev in auditoria if ev["id"] not in ids_antes]
    bloqueo = [ev for ev in nuevos if ev["action"] == "status_changed" and ev["entity_type"] == "lot"]
    assert len(bloqueo) == 1
    assert bloqueo[0]["before_value"]["status"] == "pending" and bloqueo[0]["after_value"]["status"] == "blocked"
    assert bloqueo[0]["after_value"]["reason"] == MOTIVO
    assert bloqueo[0]["actor_username"] == "admin"
    # los eventos anteriores siguen intactos
    previos_despues = {ev["id"]: ev for ev in auditoria if ev["id"] in ids_antes}
    assert all(previos_despues[ev["id"]] == ev for ev in auditoria_antes)

    # el libro de inventario y los lotes no cambian: bloquear no mueve existencias
    assert len(e["c"].get("/api/v1/inventory/movements", headers=e["adm"]).json()) == len(movimientos_antes)
    assert {f["lot_code"] for f in e["c"].get("/api/v1/inventory", headers=e["adm"]).json()} == lotes_antes


def test_no_existe_forma_de_borrar_un_lote(escenario):
    e = escenario
    for ruta in (f"/api/v1/lots/{e['lote_id']}", f"/api/v1/lots/{e['lote_id']}/status", "/api/v1/audit"):
        assert e["c"].delete(ruta, headers=e["adm"]).status_code in (404, 405)
    assert e["c"].get(f"/api/v1/lots/{e['lote_id']}", headers=e["adm"]).status_code == 200


def test_un_lote_bloqueado_no_se_puede_transformar(escenario):
    e = escenario
    _bloquear(e, e["lote_id"])
    r = e["c"].post("/api/v1/transformations", headers=e["op"], json={
        "idempotency_key": str(uuid4()), "lot_id": e["lote_id"], "stage": "secado", "occurred_at": datetime.now(timezone.utc).isoformat(),
        "input_quantity": 1, "output_quantity": 1, "unit": "kg", "output_code": "CAC001-X", "costs_cop": 0,
    })
    assert r.status_code == 409 and "bloqueado" in r.json()["detail"].lower()


def test_solo_el_administrador_puede_bloquear_y_con_motivo(escenario):
    e = escenario
    como_operador = e["c"].patch(f"/api/v1/lots/{e['lote_id']}/status", headers=e["op"], json={"status": "blocked", "reason": MOTIVO})
    assert como_operador.status_code == 403
    sin_motivo = e["c"].patch(f"/api/v1/lots/{e['lote_id']}/status", headers=e["adm"], json={"status": "blocked", "reason": ""})
    assert sin_motivo.status_code == 422
    # ninguno de los intentos fallidos cambió el estado
    ficha = e["c"].get("/api/v1/public/products/CAC001").json()
    assert ficha["status"] == "pending"


def test_liberar_de_nuevo_conserva_ambos_cambios_en_la_auditoria(escenario):
    e = escenario
    _bloquear(e, e["lote_id"])
    e["c"].patch(f"/api/v1/lots/{e['lote_id']}/status", headers=e["adm"], json={"status": "released", "reason": "Revisado y corregido"})
    cambios = [ev for ev in e["c"].get("/api/v1/audit", headers=e["adm"]).json()
               if ev["action"] == "status_changed" and ev["entity_type"] == "lot" and ev["entity_id"] == str(e["lote_id"])]
    assert [c["after_value"]["status"] for c in sorted(cambios, key=lambda c: c["id"])] == ["blocked", "released"]
