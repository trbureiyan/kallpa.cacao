#!/usr/bin/env python3
"""Respaldo, restauración y verificación de la base SQLite de kallpa.cacao.

Solo biblioteca estándar. Uso desde la raíz del repositorio:

    python scripts/respaldo.py backup                       # copia la base que usa la API a datos/respaldo/
    python scripts/respaldo.py verify  datos/respaldo/cacao_<fecha>.json
    python scripts/respaldo.py restore datos/respaldo/cacao_<fecha>.db --confirmar

La base se toma de --db o, si no se indica, se resuelve como lo hace la API: variable DATABASE_URL, luego
backend/.env, luego la única de datos/runtime/cacao.db y backend/cacao.db que exista. Siempre se imprime cuál se usó.
Restaurar reemplaza la base activa: detenga la API antes. Antes de reemplazar guarda una copia de seguridad del estado
actual en datos/respaldo/ (pre_restauracion_*.db). PostgreSQL no está cubierto: use pg_dump / pg_restore.
"""
import argparse
import hashlib
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
DESTINO_POR_DEFECTO = RAIZ / "datos" / "respaldo"


class ErrorRespaldo(Exception):
    """Error con mensaje listo para mostrar: qué pasó y qué hacer."""


def _sello() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")


def _abrir_lectura(ruta: Path) -> sqlite3.Connection:
    # solo lectura: calcular una huella nunca debe modificar la base
    return sqlite3.connect(f"{ruta.resolve().as_uri()}?mode=ro", uri=True)


def _sha256_archivo(ruta: Path) -> str:
    h = hashlib.sha256()
    with open(ruta, "rb") as f:
        for bloque in iter(lambda: f.read(1024 * 1024), b""):
            h.update(bloque)
    return h.hexdigest()


def huella(db: Path) -> dict:
    """Cantidad de filas, hash de identificadores y hash de contenido por tabla.

    Dos bases con la misma huella tienen las mismas filas: sin pérdida ni duplicación.
    """
    con = _abrir_lectura(db)
    try:
        nombres = [
            r[0]
            for r in con.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        ]
        tablas = {}
        for t in nombres:
            try:
                filas = con.execute(f'SELECT rowid, * FROM "{t}" ORDER BY rowid').fetchall()
                ids = [str(f[0]) for f in filas]
            except sqlite3.OperationalError:  # tabla WITHOUT ROWID
                filas = con.execute(f'SELECT * FROM "{t}" ORDER BY 1').fetchall()
                ids = [str(f[0]) for f in filas]
            tablas[t] = {
                "filas": len(filas),
                "ids": hashlib.sha256("\n".join(ids).encode()).hexdigest(),
                "contenido": hashlib.sha256(repr(filas).encode()).hexdigest(),
            }
        return {"tablas": tablas}
    finally:
        con.close()


def _copiar(origen: Path, destino: Path) -> None:
    """Copia consistente con la API de respaldo de SQLite (válida con la base en uso y en modo WAL)."""
    src = _abrir_lectura(origen)
    dst = sqlite3.connect(destino)
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()


def respaldar(db: Path, destino: Path, ahora: str | None = None) -> Path:
    db, destino = Path(db), Path(destino)
    if not db.exists():
        raise ErrorRespaldo(f"No se hizo el respaldo: la base {db} no existe. Revise la ruta o inicie la API una vez para crearla.")

    # idempotente: si el último respaldo tiene exactamente los mismos datos, no se crea otro
    actual = huella(db)
    # el más reciente por fecha de modificación, no por nombre: un nombre puesto a mano no engaña la comparación
    for previo in sorted(destino.glob("cacao_*.json"), key=lambda f: f.stat().st_mtime, reverse=True)[:1]:
        datos = json.loads(previo.read_text(encoding="utf-8"))
        archivo = previo.with_suffix(".db")
        if datos.get("tablas") == actual["tablas"] and archivo.exists():
            return archivo

    destino.mkdir(parents=True, exist_ok=True)
    copia = destino / f"cacao_{ahora or _sello()}.db"
    _copiar(db, copia)
    # la huella se toma de la copia, que es lo que se restaurará
    registro = {
        "origen": str(db),
        "archivo": copia.name,
        "creado": datetime.now(timezone.utc).isoformat(),
        "sha256": _sha256_archivo(copia),
        **huella(copia),
    }
    copia.with_suffix(".json").write_text(json.dumps(registro, indent=2, ensure_ascii=False), encoding="utf-8")
    return copia


def _diferencias(a: dict, b: dict) -> list[str]:
    return sorted(t for t in set(a) | set(b) if a.get(t) != b.get(t))


def verificar(db: Path, ruta_huella: Path) -> dict:
    esperado = json.loads(Path(ruta_huella).read_text(encoding="utf-8"))["tablas"]
    diferencias = _diferencias(huella(Path(db))["tablas"], esperado)
    return {"coincide": not diferencias, "diferencias": diferencias}


def restaurar(respaldo: Path, db: Path, confirmar: bool, destino_seguridad: Path | None = None) -> dict:
    respaldo, db = Path(respaldo), Path(db)
    if not confirmar:
        raise ErrorRespaldo(
            "No se restauró nada. Restaurar reemplaza la base activa y se pierde lo posterior al respaldo. "
            "Detenga la API y repita con --confirmar."
        )
    registro_ruta = respaldo.with_suffix(".json")
    if not respaldo.exists() or not registro_ruta.exists():
        raise ErrorRespaldo(f"No se restauró nada. Falta {respaldo.name} o su archivo .json de checksum. Use un respaldo hecho con este script.")
    registro = json.loads(registro_ruta.read_text(encoding="utf-8"))
    if _sha256_archivo(respaldo) != registro["sha256"]:
        raise ErrorRespaldo("No se restauró nada. El respaldo está alterado: su checksum sha256 no coincide con el registrado. Use otro respaldo.")
    con = _abrir_lectura(respaldo)
    try:
        if con.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ErrorRespaldo("No se restauró nada. El respaldo no pasa la verificación de integridad de SQLite. Use otro respaldo.")
    finally:
        con.close()

    seguridad = None
    if db.exists():
        carpeta = Path(destino_seguridad) if destino_seguridad else respaldo.parent
        carpeta.mkdir(parents=True, exist_ok=True)
        seguridad = carpeta / f"pre_restauracion_{_sello()}.db"
        _copiar(db, seguridad)  # lo posterior al respaldo no se pierde del todo

    db.parent.mkdir(parents=True, exist_ok=True)
    temporal = db.with_name(db.name + ".restaurando")
    _copiar(respaldo, temporal)
    try:
        os.replace(temporal, db)  # atómico: o queda la base vieja o la restaurada
    except PermissionError as e:
        temporal.unlink(missing_ok=True)
        raise ErrorRespaldo("No se pudo reemplazar la base: está en uso. Detenga la API y repita.") from e
    # [DECISION] los restos de la base anterior se borran DESPUÉS del reemplazo, no antes: si el reemplazo falla,
    # la base original conserva su -wal con transacciones confirmadas. El estado previo ya está en la copia de seguridad.
    for sufijo in ("-wal", "-shm", "-journal"):  # mezclarlos con la base restaurada la corrompería
        Path(str(db) + sufijo).unlink(missing_ok=True)

    diferencias = _diferencias(huella(db)["tablas"], registro["tablas"])
    return {"coincide": not diferencias, "diferencias": diferencias, "copia_de_seguridad": str(seguridad) if seguridad else None}


def _url_de_env_backend(raiz: Path) -> str | None:
    """DATABASE_URL de backend/.env: la API lo lee desde su carpeta de trabajo, que es backend/."""
    archivo = raiz / "backend" / ".env"
    if not archivo.exists():
        return None
    for linea in archivo.read_text(encoding="utf-8").splitlines():
        clave, _, valor = linea.strip().partition("=")
        if clave.strip() == "DATABASE_URL":
            return valor.strip().strip("\"'")
    return None


def resolver_db(explicita: Path | None, env: dict | None = None, raiz: Path = RAIZ) -> Path:
    """Qué base usar: la indicada, o la misma que usaría la API. Nunca elige entre dos bases en silencio."""
    if explicita:
        return Path(explicita)
    env = os.environ if env is None else env
    url = env.get("DATABASE_URL") or _url_de_env_backend(raiz)
    if url:
        if not url.startswith("sqlite:///"):
            raise ErrorRespaldo("Este script solo cubre SQLite y DATABASE_URL apunta a otro motor. Para PostgreSQL use pg_dump y pg_restore.")
        ruta = Path(url[len("sqlite:///"):].split("?")[0])
        # una ruta relativa se resuelve desde backend/, que es donde corre la API
        return ruta if ruta.is_absolute() else raiz / "backend" / ruta
    candidatas = [raiz / "datos" / "runtime" / "cacao.db", raiz / "backend" / "cacao.db"]
    existentes = [c for c in candidatas if c.exists()]
    if len(existentes) > 1:
        raise ErrorRespaldo(
            "Hay dos bases posibles (" + " y ".join(str(c) for c in existentes) + ") y no se sabe cuál usa la API. "
            "Indique la correcta con --db o defina DATABASE_URL."
        )
    # sin nada configurado la API crea backend/cacao.db (DATABASE_URL por defecto sqlite:///./cacao.db)
    return existentes[0] if existentes else raiz / "backend" / "cacao.db"


def main(argv: list[str] | None = None) -> int:
    # la consola de Windows usa cp1252 y rompería los acentos de los mensajes
    for flujo in (sys.stdout, sys.stderr):
        flujo.reconfigure(encoding="utf-8", errors="replace")
    p = argparse.ArgumentParser(description="Respaldo y restauración de la base SQLite")
    sub = p.add_subparsers(dest="orden", required=True)
    b = sub.add_parser("backup", help="crea un respaldo con checksum")
    b.add_argument("--db", type=Path, default=None, help="base SQLite; por defecto la que usa la API")
    b.add_argument("--destino", type=Path, default=DESTINO_POR_DEFECTO)
    v = sub.add_parser("verify", help="compara la base activa con la huella de un respaldo")
    v.add_argument("huella", type=Path)
    v.add_argument("--db", type=Path, default=None)
    r = sub.add_parser("restore", help="restaura un respaldo (reemplaza la base activa)")
    r.add_argument("respaldo", type=Path)
    r.add_argument("--db", type=Path, default=None)
    r.add_argument("--confirmar", action="store_true")
    a = p.parse_args(argv)

    try:
        a.db = resolver_db(a.db)
        print(f"Base: {a.db}")
        if a.orden == "backup":
            copia = respaldar(a.db, a.destino)
            print(f"Respaldo: {copia}")
            for t, d in json.loads(copia.with_suffix(".json").read_text(encoding="utf-8"))["tablas"].items():
                print(f"  {t}: {d['filas']} filas")
            return 0
        if a.orden == "verify":
            res = verificar(a.db, a.huella)
            print("La base coincide con el respaldo." if res["coincide"] else f"Hay diferencias en: {', '.join(res['diferencias'])}")
            return 0 if res["coincide"] else 1
        res = restaurar(a.respaldo, a.db, a.confirmar)
        if res["copia_de_seguridad"]:
            print(f"Estado previo guardado en: {res['copia_de_seguridad']}")
        print("Restauración verificada: mismas filas e identificadores que el respaldo." if res["coincide"] else f"ATENCIÓN: diferencias en {', '.join(res['diferencias'])}")
        return 0 if res["coincide"] else 1
    except ErrorRespaldo as e:
        print(e, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
