"""Límite de peticiones por IP: frena abuso y fuerza bruta sobre el login sin afectar al uso normal."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.security.rate_limit import LimitadorPorIp, instalar_limite


def _app(general=5, login=2) -> TestClient:
    app = FastAPI()
    instalar_limite(app, por_minuto=general, login_por_minuto=login, prefijo_api="/api/v1")

    @app.get("/api/v1/algo")
    def algo():
        return {"ok": True}

    @app.post("/api/v1/auth/login")
    def login_():
        return {"ok": True}

    @app.get("/health")
    def health():
        return {"ok": True}

    return TestClient(app)


def test_limitador_permite_hasta_el_maximo_y_luego_bloquea():
    limitador = LimitadorPorIp(ventana_segundos=60)
    assert [limitador.permitir("1.1.1.1", "x", 3, ahora=0) for _ in range(4)] == [True, True, True, False]


def test_limitador_cuenta_por_ip_de_forma_independiente():
    limitador = LimitadorPorIp(ventana_segundos=60)
    for _ in range(3):
        limitador.permitir("1.1.1.1", "x", 3, ahora=0)
    assert limitador.permitir("2.2.2.2", "x", 3, ahora=0) is True


def test_limitador_vuelve_a_permitir_al_terminar_la_ventana():
    limitador = LimitadorPorIp(ventana_segundos=60)
    for _ in range(3):
        limitador.permitir("1.1.1.1", "x", 3, ahora=0)
    assert limitador.permitir("1.1.1.1", "x", 3, ahora=61) is True


def test_limitador_descarta_ips_vencidas_para_no_crecer_sin_limite():
    limitador = LimitadorPorIp(ventana_segundos=60)
    for i in range(50):
        limitador.permitir(f"10.0.0.{i}", "x", 3, ahora=0)
    limitador.permitir("9.9.9.9", "x", 3, ahora=500)
    assert len(limitador._contadores) == 1


def test_la_peticion_que_excede_el_limite_recibe_429_con_retry_after():
    client = _app(general=3)
    assert [client.get("/api/v1/algo").status_code for _ in range(3)] == [200, 200, 200]
    r = client.get("/api/v1/algo")
    assert r.status_code == 429
    assert int(r.headers["Retry-After"]) >= 1
    assert "intentos" in r.json()["detail"].lower() or "solicitudes" in r.json()["detail"].lower()


def test_el_login_tiene_un_limite_mas_estricto_que_el_resto_de_la_api():
    client = _app(general=50, login=2)
    assert [client.post("/api/v1/auth/login").status_code for _ in range(3)] == [200, 200, 429]
    assert client.get("/api/v1/algo").status_code == 200


def test_health_no_se_limita_porque_lo_consulta_render():
    client = _app(general=1)
    assert all(client.get("/health").status_code == 200 for _ in range(10))


def test_se_usa_la_ip_de_cloudflare_y_no_x_forwarded_for_que_el_cliente_puede_falsear():
    client = _app(general=2)
    for falsa in ("1.1.1.1", "2.2.2.2", "3.3.3.3"):
        client.get("/api/v1/algo", headers={"CF-Connecting-IP": "8.8.8.8", "X-Forwarded-For": falsa})
    r = client.get("/api/v1/algo", headers={"CF-Connecting-IP": "8.8.8.8", "X-Forwarded-For": "4.4.4.4"})
    assert r.status_code == 429
    # otra IP real no se ve afectada
    assert client.get("/api/v1/algo", headers={"CF-Connecting-IP": "9.9.9.9"}).status_code == 200


def test_los_visitantes_no_comparten_cupo():
    client = _app(general=1)
    assert client.get("/api/v1/algo", headers={"CF-Connecting-IP": "5.5.5.5"}).status_code == 200
    assert client.get("/api/v1/algo", headers={"CF-Connecting-IP": "6.6.6.6"}).status_code == 200
