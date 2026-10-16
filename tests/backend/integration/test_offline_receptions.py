import sys
import unittest
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import UUID

from sqlalchemy import create_engine, func
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "backend"))

from app import models  # noqa: E402
from app.api.receptions import create_reception  # noqa: E402
from app.database import Base  # noqa: E402
from app.schemas.api import ReceptionCreate  # noqa: E402


class OfflineReceptionTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.db = self.Session()
        self.actor = models.User(
            username="operator",
            full_name="Operator",
            password_hash="not-used",
            role="operator",
        )
        producer = models.Producer(code="P-1", name="Producer")
        self.db.add_all([self.actor, producer])
        self.db.flush()
        self.farm = models.Farm(producer_id=producer.id, name="Farm", region="Huila")
        self.db.add(self.farm)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def request(self, key: UUID, quantity: str = "10.000"):
        return ReceptionCreate(
            idempotency_key=key,
            farm_id=self.farm.id,
            received_at=datetime(2026, 10, 15, 9, tzinfo=timezone.utc),
            quantity_kg=Decimal(quantity),
            purchase_total_cop=Decimal("0.00"),
            quality_notes=None,
        )

    def test_server_assigns_code_and_replay_does_not_duplicate(self):
        key = UUID("f5df0a33-83a9-4c11-bf4e-5a6b712037bd")
        data = self.request(key)

        first = create_reception(data, self.db, self.actor)
        replay = create_reception(data, self.db, self.actor)

        self.assertRegex(first["lot_code"], r"^CAC\d{3,}(-[A-F0-9]{6})?$")
        self.assertEqual(replay["lot_code"], first["lot_code"])
        self.assertEqual(replay["lot_id"], first["lot_id"])
        self.assertEqual(self.db.query(func.count(models.Lot.id)).scalar(), 1)
        self.assertEqual(self.db.query(func.count(models.InventoryMovement.id)).scalar(), 1)

    def test_reusing_uuid_with_changed_data_is_rejected(self):
        key = UUID("248ff6df-d918-4a38-bd5c-c550c576c613")
        create_reception(self.request(key), self.db, self.actor)

        with self.assertRaises(HTTPException) as caught:
            create_reception(self.request(key, "11.000"), self.db, self.actor)

        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(self.db.query(func.count(models.Lot.id)).scalar(), 1)

    def test_reception_requires_timezone_even_when_retrying(self):
        key = UUID("268ff6df-d918-4a38-bd5c-c550c576c614")
        create_reception(self.request(key), self.db, self.actor)
        data = self.request(key)
        data.received_at = data.received_at.replace(tzinfo=None)

        with self.assertRaises(HTTPException) as caught:
            create_reception(data, self.db, self.actor)

        self.assertEqual(caught.exception.status_code, 422)
        self.assertEqual(self.db.query(func.count(models.Lot.id)).scalar(), 1)


if __name__ == "__main__":
    unittest.main()
