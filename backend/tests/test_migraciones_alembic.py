import os
import subprocess
import sys

from sqlalchemy import create_engine, inspect, text


def test_alembic_aplica_esquema_completo_en_base_nueva(tmp_path):
    database_path = (tmp_path / "migration-test.db").as_posix()
    database_url = f"sqlite:///{database_path}"
    environment = os.environ.copy()
    environment.update({
        "DATABASE_URL": database_url,
        "SEED_DEMO_DATA": "false",
        "SECRET_KEY": "pytest-migration-key",
    })

    backend_dir = os.path.dirname(os.path.dirname(__file__))
    initial = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "9e28065e5d47"], cwd=backend_dir,
        env=environment, capture_output=True, text=True, check=False,
    )
    assert initial.returncode == 0, initial.stdout + initial.stderr

    # Simulate a database that already contains a reception and a transformation
    # before the output-lot migration is installed.
    engine = create_engine(database_url)
    try:
        with engine.begin() as connection:
            connection.execute(text("""insert into producers (id, name, code, contact)
                values (1, 'Productor legado', 'LEGACY', null)"""))
            connection.execute(text("insert into users (id, username, full_name, password_hash, role, active, created_at) "
                                    "values (1, 'operador', 'Operador', 'hash', 'operator', 1, '2026-01-01T00:00:00')"))
            connection.execute(text("insert into farms (id, producer_id, name, region) values (1, 1, 'Finca vieja', 'Rivera')"))
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
    finally:
        engine.dispose()

    upgraded = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"], cwd=backend_dir,
        env=environment, capture_output=True, text=True, check=False,
    )
    assert upgraded.returncode == 0, upgraded.stdout + upgraded.stderr

    engine = create_engine(database_url)
    try:
        tables = set(inspect(engine).get_table_names())
        assert {"users", "producers", "farms", "lots", "receptions", "inventory_movements",
                "transformations", "transformation_outputs", "finance_records", "cost_entries", "audit_events"}.issubset(tables)
        assert "product_type" in {column["name"] for column in inspect(engine).get_columns("lots")}
        with engine.connect() as connection:
            assert connection.scalar(text("select version_num from alembic_version")) == "d843a91c5e2b"
            product = connection.execute(text("select code, product_type, origin, received_quantity, available_quantity "
                                              "from lots where code='DRY-LEGACY'")).mappings().one()
            assert product["product_type"] == "processed_cocoa"
            assert product["origin"] == "Rivera"
            assert float(product["received_quantity"]) == 80
            assert float(product["available_quantity"]) == 80
            output_lot_id = connection.scalar(text("select lot_id from transformation_outputs where transformation_id=1"))
            assert output_lot_id is not None
            assert connection.scalar(text("select count(*) from inventory_movements "
                                           "where lot_id=:lot_id and movement_type='production'"),
                                     {"lot_id": output_lot_id}) == 1
    finally:
        engine.dispose()
