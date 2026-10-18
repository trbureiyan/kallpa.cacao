#!/usr/bin/env python3
"""Vacía la base de DEMOSTRACIÓN y la deja con los datos básicos (usuarios demo y CAC001-003).

Uso desde backend/ con DATABASE_URL apuntando a la base de la demo:

    python ../scripts/reiniciar_demo.py --confirmar

Destruye todos los registros, incluida la auditoría. Nunca apunte a una base con datos reales.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.database import SessionLocal, engine  # noqa: E402
from app.seed import reiniciar_demo  # noqa: E402


def main() -> int:
    if "--confirmar" not in sys.argv:
        print("No se hizo nada. Este script borra todos los datos de la base; repita con --confirmar si es la base de la demo.")
        return 2
    with SessionLocal() as db:
        reiniciar_demo(db)
    # solo el nombre de la base, nunca la URL: contiene la contraseña
    print(f"Demo reiniciada en la base '{engine.url.database}' ({engine.dialect.name}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
