import os
import subprocess
import sys

import pytest
from sqlalchemy import create_engine, inspect, text


def _run_alembic(backend_dir, environment, *args):
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args], cwd=backend_dir,
        env=environment, capture_output=True, text=True, check=False,
    )


def test_alembic_migra_costos_y_protege_auditoria(tmp_path):
    database_url = f"sqlite:///{(tmp_path / 'migration-test.db').as_posix()}"
    environment = os.environ.copy()
    environment.update({
        "DATABASE_URL": database_url,
        "SEED_DEMO_DATA": "false",
        "SECRET_KEY": "pytest-migration-key",
    })
    backend_dir = os.path.dirname(os.path.dirname(__file__))

    initial = _run_alembic(backend_dir, environment, "upgrade", "9e28065e5d47")
    assert initial.returncode == 0, initial.stdout + initial.stderr

    engine = create_engine(database_url)
    try:
        with engine.begin() as connection:
            connection.execute(text("insert into producers (id, name, code, contact) "
                                    "values (1, 'Productor legado', 'LEGACY', null)"))
            connection.execute(text("insert into users "
                                    "(id, username, full_name, password_hash, role, active, created_at) "
                                    "values (1, 'operador', 'Operador', 'hash', 'operator', 1, '2026-01-01T00:00:00')"))
            connection.execute(text("insert into farms (id, producer_id, name, region) "
                                    "values (1, 1, 'Finca vieja', 'Rivera')"))
            connection.execute(text("""insert into lots
                (id, code, producer_id, farm_id, origin, received_on, received_quantity, unit,
                 available_quantity, consumed_quantity, status, status_reason, created_at)
                values (1, 'CAC-LEGACY', 1, 1, 'Rivera', '2026-01-01', 100, 'kg',
                        0, 100, 'pending', null, '2026-01-01T00:00:00')"""))
            connection.execute(text("""insert into transformations
                (id, idempotency_key, lot_id, stage, responsible_id, occurred_at, input_quantity,
                 output_quantity, unit, incident, output_code, costs_cop, sale_price_cop_per_unit,
                 output_status, status_reason, created_at)
                values (1, 'legacy-transform-1', 1, 'secado', 1, '2026-01-02T10:00:00', 100,
                        80, 'kg', null, 'DRY-LEGACY', 1000, null, 'pending', null,
                        '2026-01-02T10:00:00')"""))
            # The old economics endpoint exposed FinanceRecord, even if the duplicate disagreed.
            connection.execute(text("""insert into finance_records
                (id, transformation_id, total_cost_cop, sale_price_cop_per_unit)
                values (1, 1, 2500, 25000)"""))
    finally:
        engine.dispose()

    upgraded = _run_alembic(backend_dir, environment, "upgrade", "head")
    assert upgraded.returncode == 0, upgraded.stdout + upgraded.stderr

    engine = create_engine(database_url)
    try:
        tables = set(inspect(engine).get_table_names())
        assert {"users", "producers", "farms", "lots", "receptions", "inventory_movements",
                "transformations", "transformation_outputs", "cost_entries", "audit_events"}.issubset(tables)
        assert "finance_records" not in tables
        assert "product_type" in {column["name"] for column in inspect(engine).get_columns("lots")}
        transformation_columns = {column["name"] for column in inspect(engine).get_columns("transformations")}
        output_link_columns = {column["name"] for column in inspect(engine).get_columns("transformation_outputs")}
        assert not {"output_quantity", "output_status", "status_reason", "costs_cop"} & transformation_columns
        assert "quantity" not in output_link_columns
        with engine.connect() as connection:
            assert connection.scalar(text("select version_num from alembic_version")) == "b6d1ef3a9204"
            assert "municipality" in {column["name"] for column in inspect(engine).get_columns("users")}
            product = connection.execute(text("select code, product_type, origin, received_quantity, available_quantity "
                                              "from lots where code='DRY-LEGACY'")).mappings().one()
            assert product["product_type"] == "processed_cocoa"
            assert product["origin"] == "Rivera"
            assert float(product["received_quantity"]) == 80
            assert float(product["available_quantity"]) == 80
            output_lot_id = connection.scalar(text("select lot_id from transformation_outputs where transformation_id=1"))
            assert connection.scalar(text("select output_code from transformations where id=1")) is None
            assert connection.scalar(text("select count(*) from inventory_movements "
                                          "where lot_id=:lot_id and movement_type='production'"),
                                     {"lot_id": output_lot_id}) == 1
            assert float(connection.scalar(text(
                "select amount_cop from cost_entries where transformation_id=1 and category='processing'"
            ))) == 2500
            connection.execute(text("insert into audit_events "
                                    "(actor_id, entity_type, entity_id, action, before_value, after_value, created_at) "
                                    "values (1, 'lot', '1', 'received', null, '{}', '2026-01-01T00:00:00')"))
            connection.commit()
            with pytest.raises(Exception, match="append-only"):
                connection.execute(text("update audit_events set action='modified'"))
            connection.rollback()
            with pytest.raises(Exception, match="append-only"):
                connection.execute(text("delete from audit_events"))
    finally:
        engine.dispose()

    downgraded = _run_alembic(backend_dir, environment, "downgrade", "d843a91c5e2b")
    assert downgraded.returncode == 0, downgraded.stdout + downgraded.stderr
    engine = create_engine(database_url)
    try:
        with engine.connect() as connection:
            assert float(connection.scalar(text(
                "select total_cost_cop from finance_records where transformation_id=1"
            ))) == 2500
            assert float(connection.scalar(text(
                "select costs_cop from transformations where id=1"
            ))) == 2500
            assert connection.scalar(text("select output_code from transformations where id=1")) == "DRY-LEGACY"
            assert float(connection.scalar(text("select output_quantity from transformations where id=1"))) == 80
            assert float(connection.scalar(text(
                "select quantity from transformation_outputs where transformation_id=1"
            ))) == 80
    finally:
        engine.dispose()

    upgraded_again = _run_alembic(backend_dir, environment, "upgrade", "head")
    assert upgraded_again.returncode == 0, upgraded_again.stdout + upgraded_again.stderr
    engine = create_engine(database_url)
    try:
        with engine.connect() as connection:
            assert float(connection.scalar(text(
                "select sum(amount_cop) from cost_entries where transformation_id=1 and category='processing'"
            ))) == 2500
    finally:
        engine.dispose()
