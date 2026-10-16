"""Respaldo y restauración de la base SQLite (scripts/respaldo.py).

Solo usa bases temporales creadas en cada prueba: nunca toca datos/runtime/.
Se ejecuta con: python -m pytest tests/backend/integration/test_respaldo.py -q
"""
import json
import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "scripts"))
import respaldo  # noqa: E402


def crear_db(ruta: Path, lotes: int = 3) -> None:
    con = sqlite3.connect(ruta)
    con.executescript(
        """
        CREATE TABLE lots (id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, qty NUMERIC NOT NULL);
        CREATE TABLE movements (id INTEGER PRIMARY KEY, lot_id INTEGER NOT NULL, kind TEXT, qty NUMERIC);
        CREATE TABLE audit_events (id INTEGER PRIMARY KEY, action TEXT, entity_id TEXT);
        """
    )
    for i in range(1, lotes + 1):
        con.execute("INSERT INTO lots (code, qty) VALUES (?, ?)", (f"CAC{i:03d}", 100 * i))
        con.execute("INSERT INTO movements (lot_id, kind, qty) VALUES (?, 'reception', ?)", (i, 100 * i))
        con.execute("INSERT INTO audit_events (action, entity_id) VALUES ('received', ?)", (str(i),))
    con.commit()
    con.close()


def contar(ruta: Path, tabla: str) -> int:
    con = sqlite3.connect(ruta)
    try:
        return con.execute(f"SELECT COUNT(*) FROM {tabla}").fetchone()[0]
    finally:
        con.close()


@pytest.fixture
def entorno(tmp_path):
    db = tmp_path / "runtime" / "cacao.db"
    db.parent.mkdir()
    crear_db(db)
    return {"db": db, "dest": tmp_path / "respaldo"}


def test_respaldo_crea_copia_con_huella_y_cantidades(entorno):
    copia = respaldo.respaldar(entorno["db"], entorno["dest"])
    assert copia.exists()
    huella = json.loads(copia.with_suffix(".json").read_text(encoding="utf-8"))
    assert huella["tablas"]["lots"]["filas"] == 3
    assert huella["tablas"]["movements"]["filas"] == 3
    assert len(huella["sha256"]) == 64
    assert contar(copia, "lots") == 3


def test_respaldo_con_la_base_en_uso_es_consistente(entorno):
    # una escritura sin confirmar en otra conexión no debe colarse en la copia
    abierta = sqlite3.connect(entorno["db"])
    abierta.execute("INSERT INTO lots (code, qty) VALUES ('SIN-CONFIRMAR', 1)")
    copia = respaldo.respaldar(entorno["db"], entorno["dest"])
    abierta.rollback()
    abierta.close()
    assert contar(copia, "lots") == 3


def test_respaldo_es_idempotente_si_nada_cambio(entorno):
    primero = respaldo.respaldar(entorno["db"], entorno["dest"])
    segundo = respaldo.respaldar(entorno["db"], entorno["dest"])
    assert segundo == primero
    assert len(list(entorno["dest"].glob("cacao_*.db"))) == 1


def test_respaldo_nuevo_si_hubo_cambios(entorno):
    respaldo.respaldar(entorno["db"], entorno["dest"], ahora="20260101_000000")
    con = sqlite3.connect(entorno["db"])
    con.execute("INSERT INTO lots (code, qty) VALUES ('CAC999', 5)")
    con.commit()
    con.close()
    respaldo.respaldar(entorno["db"], entorno["dest"], ahora="20260101_000001")
    assert len(list(entorno["dest"].glob("cacao_*.db"))) == 2


def test_restaurar_sin_confirmar_no_toca_la_base(entorno):
    copia = respaldo.respaldar(entorno["db"], entorno["dest"])
    con = sqlite3.connect(entorno["db"])
    con.execute("DELETE FROM lots")
    con.commit()
    con.close()
    with pytest.raises(respaldo.ErrorRespaldo, match="confirm"):
        respaldo.restaurar(copia, entorno["db"], confirmar=False, destino_seguridad=entorno["dest"])
    assert contar(entorno["db"], "lots") == 0


def test_restaurar_recupera_cantidades_e_identificadores_sin_perdida_ni_duplicacion(entorno):
    copia = respaldo.respaldar(entorno["db"], entorno["dest"])
    original = respaldo.huella(entorno["db"])

    # estado dañado: se pierden filas y se agregan otras
    con = sqlite3.connect(entorno["db"])
    con.execute("DELETE FROM lots WHERE id IN (1, 2)")
    con.execute("DELETE FROM audit_events")
    con.execute("INSERT INTO lots (code, qty) VALUES ('EXTRA', 9)")
    con.commit()
    con.close()
    assert respaldo.huella(entorno["db"]) != original

    resultado = respaldo.restaurar(copia, entorno["db"], confirmar=True, destino_seguridad=entorno["dest"])

    assert respaldo.huella(entorno["db"]) == original
    assert resultado["coincide"] is True
    assert contar(entorno["db"], "lots") == 3
    assert contar(entorno["db"], "audit_events") == 3


def test_restaurar_guarda_copia_de_seguridad_del_estado_previo(entorno):
    copia = respaldo.respaldar(entorno["db"], entorno["dest"])
    con = sqlite3.connect(entorno["db"])
    con.execute("INSERT INTO lots (code, qty) VALUES ('POSTERIOR', 7)")
    con.commit()
    con.close()
    resultado = respaldo.restaurar(copia, entorno["db"], confirmar=True, destino_seguridad=entorno["dest"])
    seguridad = Path(resultado["copia_de_seguridad"])
    assert seguridad.exists()
    assert contar(seguridad, "lots") == 4  # lo posterior al respaldo no se pierde del todo


def test_restaurar_rechaza_un_respaldo_alterado(entorno):
    copia = respaldo.respaldar(entorno["db"], entorno["dest"])
    con = sqlite3.connect(copia)
    con.execute("DELETE FROM lots WHERE id = 1")
    con.commit()
    con.close()
    antes = respaldo.huella(entorno["db"])
    with pytest.raises(respaldo.ErrorRespaldo, match="checksum|sha256"):
        respaldo.restaurar(copia, entorno["db"], confirmar=True, destino_seguridad=entorno["dest"])
    assert respaldo.huella(entorno["db"]) == antes


def test_restaurar_crea_la_base_si_se_borro(entorno):
    copia = respaldo.respaldar(entorno["db"], entorno["dest"])
    entorno["db"].unlink()
    respaldo.restaurar(copia, entorno["db"], confirmar=True, destino_seguridad=entorno["dest"])
    assert contar(entorno["db"], "lots") == 3


def test_respaldar_una_base_inexistente_falla_sin_crear_nada(tmp_path):
    with pytest.raises(respaldo.ErrorRespaldo, match="no existe"):
        respaldo.respaldar(tmp_path / "nada.db", tmp_path / "respaldo")
    assert not (tmp_path / "nada.db").exists()


def test_verificar_detecta_diferencias(entorno):
    copia = respaldo.respaldar(entorno["db"], entorno["dest"])
    assert respaldo.verificar(entorno["db"], copia.with_suffix(".json"))["coincide"] is True
    con = sqlite3.connect(entorno["db"])
    con.execute("DELETE FROM movements WHERE id = 1")
    con.commit()
    con.close()
    r = respaldo.verificar(entorno["db"], copia.with_suffix(".json"))
    assert r["coincide"] is False
    assert "movements" in r["diferencias"]


# --- ruta de la base: debe ser la misma que usa la API -------------------------------------------------------------

def raiz_falsa(tmp_path, con_runtime=False, con_backend=False, env_backend=None):
    (tmp_path / "backend").mkdir()
    (tmp_path / "datos" / "runtime").mkdir(parents=True)
    if con_runtime:
        (tmp_path / "datos" / "runtime" / "cacao.db").touch()
    if con_backend:
        (tmp_path / "backend" / "cacao.db").touch()
    if env_backend:
        (tmp_path / "backend" / ".env").write_text(env_backend, encoding="utf-8")
    return tmp_path


def test_la_base_explicita_siempre_gana(tmp_path):
    raiz = raiz_falsa(tmp_path, con_runtime=True, con_backend=True)
    otra = tmp_path / "otra.db"
    assert respaldo.resolver_db(otra, env={}, raiz=raiz) == otra


def test_database_url_relativa_se_resuelve_desde_backend_como_hace_la_api(tmp_path):
    raiz = raiz_falsa(tmp_path)
    r = respaldo.resolver_db(None, env={"DATABASE_URL": "sqlite:///../datos/runtime/cacao.db"}, raiz=raiz)
    assert r.resolve() == (raiz / "datos" / "runtime" / "cacao.db").resolve()


def test_database_url_absoluta_se_respeta(tmp_path):
    destino = tmp_path / "x" / "abs.db"
    raiz = raiz_falsa(tmp_path)
    r = respaldo.resolver_db(None, env={"DATABASE_URL": f"sqlite:///{destino.as_posix()}"}, raiz=raiz)
    assert r.resolve() == destino.resolve()


def test_sin_variable_usa_el_env_de_backend(tmp_path):
    raiz = raiz_falsa(tmp_path, env_backend="# comentario" + chr(10) + "DATABASE_URL=sqlite:///./otra.db" + chr(10))
    assert respaldo.resolver_db(None, env={}, raiz=raiz).resolve() == (raiz / "backend" / "otra.db").resolve()


def test_la_variable_de_entorno_gana_al_env_de_backend(tmp_path):
    raiz = raiz_falsa(tmp_path, env_backend="DATABASE_URL=sqlite:///./del_env.db" + chr(10))
    r = respaldo.resolver_db(None, env={"DATABASE_URL": "sqlite:///./de_entorno.db"}, raiz=raiz)
    assert r.name == "de_entorno.db"


def test_postgresql_no_esta_cubierto(tmp_path):
    raiz = raiz_falsa(tmp_path)
    with pytest.raises(respaldo.ErrorRespaldo, match="SQLite"):
        respaldo.resolver_db(None, env={"DATABASE_URL": "postgresql+psycopg://u:p@h/db"}, raiz=raiz)


@pytest.mark.parametrize(
    "runtime, backend, esperado",
    [(True, False, ("datos", "runtime")), (False, True, ("backend",))],
)
def test_sin_configuracion_usa_la_unica_base_que_existe(tmp_path, runtime, backend, esperado):
    raiz = raiz_falsa(tmp_path, con_runtime=runtime, con_backend=backend)
    r = respaldo.resolver_db(None, env={}, raiz=raiz)
    assert r.resolve() == (raiz.joinpath(*esperado) / "cacao.db").resolve()


def test_sin_configuracion_y_con_dos_bases_pide_elegir(tmp_path):
    raiz = raiz_falsa(tmp_path, con_runtime=True, con_backend=True)
    with pytest.raises(respaldo.ErrorRespaldo, match="--db"):
        respaldo.resolver_db(None, env={}, raiz=raiz)


def test_sin_configuracion_y_sin_bases_da_el_valor_por_defecto_de_la_api(tmp_path):
    raiz = raiz_falsa(tmp_path)
    assert respaldo.resolver_db(None, env={}, raiz=raiz).resolve() == (raiz / "backend" / "cacao.db").resolve()
