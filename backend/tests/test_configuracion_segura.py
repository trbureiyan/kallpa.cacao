"""Con APP_ENV=production la API no arranca con el secreto de ejemplo, un secreto corto ni datos de demostración."""
import pytest

from app.config import SECRETO_DE_EJEMPLO, Settings, validar_configuracion

SECRETO_BUENO = "x" * 40


def _config(**campos) -> Settings:
    return Settings(_env_file=None, **campos)


def test_en_desarrollo_todo_se_permite_para_no_estorbar_el_trabajo_local():
    assert validar_configuracion(_config()) == []
    assert validar_configuracion(_config(seed_demo_data=True)) == []


def test_en_produccion_el_secreto_de_ejemplo_se_rechaza():
    problemas = validar_configuracion(_config(app_env="production", seed_demo_data=False))
    assert len(problemas) == 1 and "SECRET_KEY" in problemas[0]


@pytest.mark.parametrize("secreto", ["", "corto", "a" * 31, SECRETO_DE_EJEMPLO, "replace-with-a-long-random-secret"])
def test_en_produccion_un_secreto_corto_o_de_ejemplo_se_rechaza(secreto):
    problemas = validar_configuracion(_config(app_env="production", secret_key=secreto, seed_demo_data=False))
    assert any("SECRET_KEY" in p for p in problemas)


def test_en_produccion_no_se_siembran_usuarios_de_demostracion():
    problemas = validar_configuracion(_config(app_env="production", secret_key=SECRETO_BUENO, seed_demo_data=True))
    assert len(problemas) == 1 and "SEED_DEMO_DATA" in problemas[0]


def test_en_produccion_con_secreto_largo_y_sin_sembrado_es_valido():
    assert validar_configuracion(_config(app_env="production", secret_key=SECRETO_BUENO, seed_demo_data=False)) == []


@pytest.mark.parametrize("entorno", ["development", "dev", "local", "test", " Development "])
def test_solo_los_entornos_de_desarrollo_conocidos_omiten_las_comprobaciones(entorno):
    assert validar_configuracion(_config(app_env=entorno, seed_demo_data=True)) == []


@pytest.mark.parametrize("entorno", ["prod", "produccion", "staging", "", "  ", "pro"])
def test_un_entorno_desconocido_falla_de_forma_segura_en_vez_de_desactivar_las_comprobaciones(entorno):
    problemas = validar_configuracion(_config(app_env=entorno, seed_demo_data=False))
    assert len(problemas) == 1 and "APP_ENV" in problemas[0]


def test_el_valor_de_app_env_no_distingue_mayusculas_ni_espacios():
    assert validar_configuracion(_config(app_env=" Production ", seed_demo_data=False)) != []


def test_la_api_no_arranca_si_la_configuracion_de_produccion_es_insegura(monkeypatch):
    from fastapi.testclient import TestClient

    from app import main

    monkeypatch.setattr(main.settings, "app_env", "production")
    monkeypatch.setattr(main.settings, "secret_key", SECRETO_DE_EJEMPLO)
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        with TestClient(main.app):
            pass
