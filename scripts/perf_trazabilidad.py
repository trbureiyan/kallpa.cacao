#!/usr/bin/env python3
"""Mide la consulta de trazabilidad de la API sobre 100 lotes sintéticos.

Método (declararlo así en E05):
  1. Crea una base SQLite TEMPORAL y vacía; nunca toca datos/runtime/.
  2. Genera por la API, en proceso (TestClient), 100 recepciones sintéticas. Cada lote recibe una transformación
     (100 -> 80 kg) y 30 de las salidas reciben una segunda etapa, para que haya recorridos de distinta profundidad.
  3. Consulta GET /lots/{id}/traceability de los 100 lotes recibidos, N repeticiones cada uno.
  4. La primera consulta se reporta aparte (arranque en frío). El resto se resume en min, mediana, p95 y máximo.

Mide la lógica del servidor y la base de datos (sin red ni navegador). No mide el dibujo de la pantalla: eso se
mide aparte en el navegador. Objetivo del reto: hasta 3 s después de cargar la aplicación.

Requiere las dependencias del backend: backend/.venv/Scripts/python scripts/perf_trazabilidad.py
"""
import argparse
import json
import os
import platform
import sqlite3
import statistics
import sys
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
OBJETIVO_MS = 3000


def _percentil(valores: list[float], p: float) -> float:
    orden = sorted(valores)
    return orden[min(len(orden) - 1, round(p / 100 * (len(orden) - 1)))]


def medir(lotes: int = 100, repeticiones: int = 5, con_segunda_etapa: int = 30) -> dict:
    # con menos de dos consultas no hay muestra aparte de la primera (en frío) y las estadísticas no tendrían sentido
    if lotes < 1 or repeticiones < 1 or lotes * repeticiones < 2:
        raise ValueError("lotes y repeticiones deben ser al menos 1 y dar al menos 2 consultas en total")
    sys.path.insert(0, str(RAIZ / "backend"))
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as carpeta:
        # antes de importar la app: su configuración se lee al importarla
        os.environ.update(
            DATABASE_URL=f"sqlite:///{Path(carpeta, 'perf.db').as_posix()}",
            SEED_DEMO_DATA="false",
            SECRET_KEY="perf-local-only",
            # mide la lógica del servidor, no el límite por IP: todas las peticiones salen de una misma IP
            RATE_LIMIT_PER_MINUTE="1000000",
            RATE_LIMIT_LOGIN_PER_MINUTE="1000000",
        )
        from fastapi.testclient import TestClient

        from app.database import Base, SessionLocal, engine
        from app.main import app
        from app.models import Farm, Producer, User
        from app.security.authentication import hash_password

        Base.metadata.create_all(engine)
        with SessionLocal() as db:
            db.add(User(username="admin_perf", full_name="Admin perf", password_hash=hash_password("perf-local"), role="admin"))
            productor = Producer(code="PROD-PERF", name="Productor sintético")
            db.add(productor)
            db.flush()
            finca = Farm(producer_id=productor.id, name="Finca sintética", region="Rivera")
            db.add(finca)
            db.commit()
            finca_id = finca.id

        ahora = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        with TestClient(app) as cliente:
            token = cliente.post("/api/v1/auth/login", data={"username": "admin_perf", "password": "perf-local"}).json()["access_token"]
            cliente.headers["Authorization"] = f"Bearer {token}"

            ids = []
            for i in range(lotes):
                r = cliente.post("/api/v1/receptions", json={
                    "idempotency_key": str(uuid.uuid4()), "farm_id": finca_id, "received_at": ahora,
                    "quantity_kg": 100, "purchase_total_cop": 1_000_000,
                })
                assert r.status_code == 201, r.text
                lote = r.json()
                t = cliente.post("/api/v1/transformations", json={
                    "idempotency_key": str(uuid.uuid4()), "lot_id": lote["lot_id"], "stage": "SECADO", "occurred_at": ahora,
                    "input_quantity": 100, "output_quantity": 80, "unit": "kg",
                    "output_code": f"{lote['lot_code']}-S1", "costs_cop": 1_600_000, "sale_price_cop_per_unit": 25_000,
                })
                assert t.status_code == 201, t.text
                if i < con_segunda_etapa:
                    t2 = cliente.post("/api/v1/transformations", json={
                        "idempotency_key": str(uuid.uuid4()), "lot_id": t.json()["outputs"][0]["lot_id"], "stage": "SELECCION",
                        "occurred_at": ahora, "input_quantity": 80, "output_quantity": 70, "unit": "kg",
                        "output_code": f"{lote['lot_code']}-S2", "costs_cop": 400_000,
                    })
                    assert t2.status_code == 201, t2.text
                ids.append(lote["lot_id"])

            tiempos = []
            frio = None
            inicio_total = time.perf_counter()
            for _ in range(repeticiones):
                for lote_id in ids:
                    t0 = time.perf_counter()
                    r = cliente.get(f"/api/v1/lots/{lote_id}/traceability")
                    ms = (time.perf_counter() - t0) * 1000
                    assert r.status_code == 200, r.text
                    if frio is None:
                        frio = ms
                    else:
                        tiempos.append(ms)
            total_s = time.perf_counter() - inicio_total

        engine.dispose()
        con = sqlite3.connect(Path(carpeta, "perf.db"))
        filas = {t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("lots", "receptions", "transformations", "audit_events")}
        con.close()

    maximo = max(tiempos + [frio])
    return {
        "lotes_recibidos": lotes,
        "filas": filas,
        "consultas": len(tiempos) + 1,
        "repeticiones_por_lote": repeticiones,
        "primera_consulta_ms": round(frio, 2),
        "min_ms": round(min(tiempos), 2),
        "mediana_ms": round(statistics.median(tiempos), 2),
        "p95_ms": round(_percentil(tiempos, 95), 2),
        "max_ms": round(maximo, 2),
        "total_s": round(total_s, 2),
        "objetivo_ms": OBJETIVO_MS,
        "cumple": maximo <= OBJETIVO_MS,
        "equipo": {
            "sistema": platform.platform(),
            "python": platform.python_version(),
            "cpu": platform.processor() or "desconocido",
            "nucleos": os.cpu_count(),
            "sqlite": sqlite3.sqlite_version,
        },
        "fecha": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def main() -> int:
    for flujo in (sys.stdout, sys.stderr):
        flujo.reconfigure(encoding="utf-8", errors="replace")
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--lotes", type=int, default=100)
    p.add_argument("--repeticiones", type=int, default=5)
    p.add_argument("--json", action="store_true", help="imprime solo el resultado en JSON")
    a = p.parse_args()
    try:
        r = medir(a.lotes, a.repeticiones)
    except ValueError as e:
        print(e, file=sys.stderr)
        return 2
    if a.json:
        print(json.dumps(r, ensure_ascii=False))
    else:
        e = r["equipo"]
        print(f"Trazabilidad sobre {r['lotes_recibidos']} lotes ({r['consultas']} consultas, filas: {r['filas']})")
        print(f"  primera consulta (en frío): {r['primera_consulta_ms']} ms")
        print(f"  mínimo {r['min_ms']} ms | mediana {r['mediana_ms']} ms | p95 {r['p95_ms']} ms | máximo {r['max_ms']} ms")
        print(f"  objetivo {r['objetivo_ms']} ms: {'CUMPLE' if r['cumple'] else 'NO CUMPLE'}")
        print(f"Equipo: {e['sistema']} | Python {e['python']} | {e['nucleos']} núcleos | SQLite {e['sqlite']} | {r['fecha']}")
    return 0 if r["cumple"] else 1


if __name__ == "__main__":
    sys.exit(main())
