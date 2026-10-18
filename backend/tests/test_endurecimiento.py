"""Endurecimiento para la demo: cabeceras de seguridad y límite de peticiones activos en la app real."""
from app.config import settings


def test_las_respuestas_llevan_cabeceras_de_seguridad(api):
    r = api["client"].get("/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Referrer-Policy"] == "no-referrer"
    assert "max-age" in r.headers["Strict-Transport-Security"]


def test_las_cabeceras_tambien_van_en_los_errores_del_limite(api):
    cliente = api["client"]
    for _ in range(settings.rate_limit_login_per_minute):
        cliente.post("/api/v1/auth/login", data={"username": "x", "password": "y"})
    r = cliente.post("/api/v1/auth/login", data={"username": "x", "password": "y"})
    assert r.status_code == 429
    assert r.headers["X-Content-Type-Options"] == "nosniff"


def test_el_login_se_bloquea_tras_los_intentos_permitidos_aunque_la_contrasena_sea_correcta(api):
    cliente = api["client"]
    for _ in range(settings.rate_limit_login_per_minute):
        assert cliente.post("/api/v1/auth/login", data={"username": "admin_test", "password": "mala"}).status_code == 401
    r = cliente.post("/api/v1/auth/login", data={"username": "admin_test", "password": "test"})
    assert r.status_code == 429


def test_los_limites_por_defecto_son_razonables_para_uso_humano():
    assert 5 <= settings.rate_limit_login_per_minute <= 20
    assert 60 <= settings.rate_limit_per_minute <= 300
