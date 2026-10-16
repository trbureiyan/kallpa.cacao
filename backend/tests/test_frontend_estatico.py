"""La API puede servir el build del frontend (un solo proceso), sin tapar la API ni salirse de la carpeta."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.frontend import montar_frontend


@pytest.fixture
def sitio(tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>INICIO</html>", encoding="utf-8")
    (dist / "assets" / "app-abc123.js").write_text("console.log('x')", encoding="utf-8")
    (dist / "sw.js").write_text("// sw", encoding="utf-8")
    (dist / "manifest.webmanifest").write_text("{}", encoding="utf-8")
    (tmp_path / "secreto.txt").write_text("NO-DEBE-SALIR", encoding="utf-8")

    app = FastAPI()

    @app.get("/api/v1/lots")
    def lotes():
        return [{"code": "CAC001"}]

    @app.get("/health")
    def health():
        return {"status": "ok"}

    assert montar_frontend(app, dist) is True
    return TestClient(app)


def test_la_raiz_sirve_el_index_sin_cache(sitio):
    r = sitio.get("/")
    assert r.status_code == 200 and "INICIO" in r.text
    assert r.headers["cache-control"] == "no-cache"


@pytest.mark.parametrize("ruta", ["/ficha-publica", "/dashboard", "/inventario/detalle"])
def test_las_rutas_de_la_aplicacion_caen_en_el_index(sitio, ruta):
    r = sitio.get(ruta)
    assert r.status_code == 200 and "INICIO" in r.text


def test_un_asset_se_sirve_con_cache_largo(sitio):
    r = sitio.get("/assets/app-abc123.js")
    assert r.status_code == 200 and "console.log" in r.text
    assert "immutable" in r.headers["cache-control"]


def test_un_asset_inexistente_es_404_y_no_el_index(sitio):
    r = sitio.get("/assets/no-existe.js")
    assert r.status_code == 404 and "INICIO" not in r.text


@pytest.mark.parametrize("ruta", ["/sw.js", "/manifest.webmanifest"])
def test_service_worker_y_manifiesto_nunca_se_cachean(sitio, ruta):
    r = sitio.get(ruta)
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-cache"


def test_head_responde_igual_que_get_pero_sin_cuerpo(sitio):
    r = sitio.head("/assets/app-abc123.js")
    assert r.status_code == 200 and "immutable" in r.headers["cache-control"] and r.text == ""
    assert sitio.head("/ficha-publica").status_code == 200


def test_la_api_no_queda_tapada(sitio):
    assert sitio.get("/api/v1/lots").json() == [{"code": "CAC001"}]
    assert sitio.get("/health").json() == {"status": "ok"}


@pytest.mark.parametrize("ruta", ["/api/v1/no-existe", "/api/otra", "/api"])
def test_una_ruta_de_api_desconocida_es_404_y_no_el_index(sitio, ruta):
    r = sitio.get(ruta)
    assert r.status_code == 404 and "INICIO" not in r.text


@pytest.mark.parametrize("ruta", ["/..%2fsecreto.txt", "/%2e%2e/secreto.txt", "/..%5csecreto.txt", "/assets/..%2f..%2fsecreto.txt"])
def test_no_se_puede_salir_de_la_carpeta_del_build(sitio, ruta):
    r = sitio.get(ruta)
    assert "NO-DEBE-SALIR" not in r.text


def test_sin_build_no_registra_nada(tmp_path):
    app = FastAPI()
    assert montar_frontend(app, tmp_path / "no-existe") is False
    assert TestClient(app).get("/").status_code == 404
