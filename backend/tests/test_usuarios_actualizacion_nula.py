"""PATCH /users: un campo obligatorio enviado como null se rechaza con 422 y no cambia nada; solo municipality admite null."""
import pytest

from app.models import User
from conftest import auth


def _operador_id(api) -> int:
    with api["session_factory"]() as db:
        return db.query(User).filter_by(username="operador_test").one().id


def _usuario(api, user_id: int) -> dict:
    with api["session_factory"]() as db:
        u = db.get(User, user_id)
        return {"username": u.username, "full_name": u.full_name, "role": u.role, "active": u.active, "municipality": u.municipality}


@pytest.mark.parametrize("campo", ["username", "full_name", "role", "active"])
def test_un_campo_obligatorio_en_null_da_422_y_no_modifica_al_usuario(api, campo):
    uid = _operador_id(api)
    antes = _usuario(api, uid)
    r = api["client"].patch(f"/api/v1/users/{uid}", headers=auth(api["admin_token"]), json={campo: None})
    assert r.status_code == 422, f"{campo}: {r.status_code} {r.text}"
    assert campo in r.text
    assert _usuario(api, uid) == antes


def test_la_contrasena_en_null_se_ignora_como_si_no_se_hubiera_enviado(api):
    uid = _operador_id(api)
    r = api["client"].patch(f"/api/v1/users/{uid}", headers=auth(api["admin_token"]), json={"password": None, "full_name": "Nuevo Nombre"})
    assert r.status_code == 200, r.text
    assert _usuario(api, uid)["full_name"] == "Nuevo Nombre"


def test_el_municipio_si_admite_null_para_quitar_la_asignacion(api):
    uid = _operador_id(api)
    assert api["client"].patch(f"/api/v1/users/{uid}", headers=auth(api["admin_token"]), json={"municipality": "Rivera"}).status_code == 200
    r = api["client"].patch(f"/api/v1/users/{uid}", headers=auth(api["admin_token"]), json={"municipality": None})
    assert r.status_code == 200, r.text
    assert _usuario(api, uid)["municipality"] is None


def test_una_actualizacion_valida_sigue_funcionando(api):
    uid = _operador_id(api)
    r = api["client"].patch(f"/api/v1/users/{uid}", headers=auth(api["admin_token"]), json={"full_name": "  Operador Renombrado  ", "active": False})
    assert r.status_code == 200, r.text
    assert _usuario(api, uid)["full_name"] == "Operador Renombrado" and _usuario(api, uid)["active"] is False
