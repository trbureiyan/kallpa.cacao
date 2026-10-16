"""Trazabilidad sobre 100 registros sintéticos, objetivo del reto: hasta 3 s.

Corre scripts/perf_trazabilidad.py en un proceso aparte (la app lee su configuración al importarse) y comprueba su
resultado. Requiere las dependencias del backend instaladas en el Python que ejecuta pytest.
Desde la raíz: python -m pytest tests/backend/rendimiento -q
"""
import json
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "perf_trazabilidad.py"


def test_trazabilidad_sobre_100_lotes_cumple_el_objetivo():
    proceso = subprocess.run(
        [sys.executable, "-W", "ignore", str(SCRIPT), "--json", "--repeticiones", "3"],
        capture_output=True, text=True, encoding="utf-8", timeout=600,
    )
    assert proceso.returncode in (0, 1), proceso.stderr[-2000:]
    salida = proceso.stdout.strip()
    assert salida, f"el script no imprimió resultado. stderr: {proceso.stderr[-2000:]}"
    r = json.loads(salida.splitlines()[-1])
    # los datos generados son los que declara el método
    assert r["lotes_recibidos"] == 100
    assert r["filas"]["receptions"] == 100
    assert r["filas"]["transformations"] == 130  # 100 primeras etapas + 30 segundas
    assert r["consultas"] == 300
    # el objetivo del reto, sobre el peor caso medido
    assert r["max_ms"] <= r["objetivo_ms"], f"trazabilidad más lenta de lo permitido: {r}"
    assert r["cumple"] is True
