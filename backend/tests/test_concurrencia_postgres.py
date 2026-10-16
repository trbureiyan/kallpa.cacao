"""Optional PostgreSQL race test; requires TEST_POSTGRES_URL pointing to a test DB."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import os
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import InventoryMovement, Lot, Producer, User
from app.schemas.api import TransformationCreate
from app.services.transformation import create_transformation


@pytest.mark.skipif(not os.getenv("TEST_POSTGRES_URL"), reason="Define TEST_POSTGRES_URL para ejecutar la prueba PostgreSQL")
def test_dos_consumos_concurrentes_no_dejan_inventario_negativo():
    database_url = os.environ["TEST_POSTGRES_URL"]
    parsed_url = make_url(database_url)
    if parsed_url.get_backend_name() != "postgresql":
        pytest.fail("TEST_POSTGRES_URL debe usar PostgreSQL")
    if "test" not in (parsed_url.database or "").lower():
        pytest.fail("Por seguridad, la base de TEST_POSTGRES_URL debe tener 'test' en su nombre")

    admin_engine = create_engine(database_url, pool_pre_ping=True)
    schema = f"cacao_concurrency_test_{uuid4().hex}"
    scoped_engine = None
    try:
        with admin_engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        scoped_engine = create_engine(
            database_url,
            pool_pre_ping=True,
            connect_args={"options": f"-c search_path={schema},public"},
        )
        Base.metadata.create_all(scoped_engine)
        SessionFactory = sessionmaker(bind=scoped_engine, expire_on_commit=False)
        with SessionFactory() as db:
            producer = Producer(name="Concurrent test", code=f"TEST-{uuid4().hex[:8]}")
            operator = User(username=f"operator-{uuid4().hex[:8]}", full_name="Test operator",
                            password_hash="unused", role="operator", active=True)
            db.add_all([producer, operator])
            db.flush()
            lot = Lot(code=f"RAW-{uuid4().hex[:8]}", producer_id=producer.id, origin="Huila test",
                      received_on=datetime.now(timezone.utc).date(), received_quantity=10, unit="kg",
                      available_quantity=10, consumed_quantity=0, status="pending")
            db.add(lot)
            db.commit()
            lot_id, actor_id = lot.id, operator.id

        barrier = Barrier(2)

        def consume(code: str):
            request = TransformationCreate(
                idempotency_key=str(uuid4()),
                lot_id=lot_id,
                stage="concurrent-test",
                occurred_at=datetime.now(timezone.utc),
                input_quantity=7,
                output_quantity=6,
                unit="kg",
                output_code=code,
                costs_cop=0,
            )
            with SessionFactory() as db:
                actor = db.get(User, actor_id)
                barrier.wait(timeout=10)
                try:
                    create_transformation(db, request, actor)
                    return "ok"
                except HTTPException as error:
                    return error.status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(consume, [f"OUT-{uuid4().hex[:8]}", f"OUT-{uuid4().hex[:8]}"]))

        assert sorted(outcomes, key=str) == [409, "ok"]
        with SessionFactory() as db:
            persisted = db.get(Lot, lot_id)
            assert float(persisted.available_quantity) == 3
            assert float(persisted.consumed_quantity) == 7
            assert db.query(InventoryMovement).filter_by(lot_id=lot_id, movement_type="consumption").count() == 1
            assert float(persisted.available_quantity) >= 0
    finally:
        if scoped_engine is not None:
            scoped_engine.dispose()
        with admin_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        admin_engine.dispose()
