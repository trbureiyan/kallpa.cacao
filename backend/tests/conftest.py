from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Farm, Producer, User
from app.security.authentication import create_access_token, hash_password


@pytest.fixture
def api() -> Iterator[dict]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)

    with TestingSession() as db:
        operator = User(username="operador_test", full_name="Operador", password_hash=hash_password("test"), role="operator")
        admin = User(username="admin_test", full_name="Administrador", password_hash=hash_password("test"), role="admin")
        producer = Producer(code="PROD-TEST", name="Productor de prueba")
        db.add_all([operator, admin, producer])
        db.flush()
        farm = Farm(producer_id=producer.id, name="Finca de prueba", region="Huila")
        db.add(farm)
        db.commit()
        operator_id, admin_id, farm_id = operator.id, admin.id, farm.id

    def override_get_db() -> Iterator[Session]:
        with TestingSession() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    # No usamos el contexto `with TestClient`: las pruebas crean el esquema aislado
    # aquí y no deben disparar el sembrado de demostración de la aplicación.
    client = TestClient(app)
    try:
        yield {
            "client": client,
            "farm_id": farm_id,
            "operator_token": create_access_token(User(id=operator_id, username="operador_test", full_name="Operador", password_hash="", role="operator")),
            "admin_token": create_access_token(User(id=admin_id, username="admin_test", full_name="Administrador", password_hash="", role="admin")),
            "session_factory": TestingSession,
        }
    finally:
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(engine)
        engine.dispose()


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
