from datetime import date

from app.models import AuditEvent, CostEntry, Lot, Producer, User
from conftest import auth


def test_ficha_publica_incluye_lote_crudo_sin_costos_ni_datos_privados(api):
    with api["session_factory"]() as db:
        producer = db.query(Producer).filter_by(code="PROD-TEST").one()
        producer.contact = "contacto-ficticio-privado"
        lot = Lot(
            code="CAC-RAW-PUBLIC-TEST",
            producer_id=producer.id,
            farm_id=api["farm_id"],
            product_type="raw_cocoa",
            origin="Rivera",
            received_on=date(2026, 10, 16),
            received_quantity=100,
            available_quantity=100,
            consumed_quantity=0,
            unit="kg",
            status="released",
        )
        db.add(lot)
        db.commit()
        db.add(CostEntry(lot_id=lot.id, category="purchase", amount_cop=1200000))
        db.commit()
        lot_code = lot.code

    response = api["client"].get(f"/api/v1/public/products/{lot_code}")

    assert response.status_code == 200, response.text
    product = response.json()
    assert product["code"] == lot_code
    assert product["product_type"] == "raw_cocoa"
    assert product["stage"] == "recepcion"
    assert product["output_quantity"] == 100
    assert product["unit"] == "kg"
    assert product["status"] == "released"
    assert product["availability"] == "available"
    assert product["origin"] == "Rivera"
    assert product["received_on"] == "2026-10-16"
    assert "contact" not in product
    assert "producer" not in product
    assert "costs_cop" not in product
    assert "purchase_total_cop" not in product
    assert "contacto-ficticio-privado" not in response.text
    assert "1200000" not in response.text


def test_auditoria_global_solo_admin_y_devuelve_cambios_con_actor(api):
    with api["session_factory"]() as db:
        actor = db.query(User).filter_by(username="admin_test").one()
        db.add(AuditEvent(
            actor_id=actor.id,
            entity_type="lot",
            entity_id="CAC-TEST",
            action="status_changed",
            before_value={"status": "pending"},
            after_value={"status": "blocked", "reason": "Prueba de auditoria"},
        ))
        db.commit()

    path = "/api/v1/audit"
    forbidden = api["client"].get(path, headers=auth(api["operator_token"]))
    assert forbidden.status_code == 403

    response = api["client"].get(path, headers=auth(api["admin_token"]))
    assert response.status_code == 200, response.text
    assert len(response.json()) == 1
    event = response.json()[0]
    assert event["actor_name"] == "Administrador"
    assert event["actor_username"] == "admin_test"
    assert event["action"] == "status_changed"
    assert event["entity_type"] == "lot"
    assert event["entity_id"] == "CAC-TEST"
    assert event["before_value"] == {"status": "pending"}
    assert event["after_value"] == {"status": "blocked", "reason": "Prueba de auditoria"}
    assert event["created_at"]
