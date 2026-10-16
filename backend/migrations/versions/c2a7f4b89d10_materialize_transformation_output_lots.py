"""Materialize each transformation output as an inventory lot.

Revision ID: c2a7f4b89d10
Revises: 9e28065e5d47
"""
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c2a7f4b89d10"
down_revision: Union[str, None] = "9e28065e5d47"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("lots", sa.Column("product_type", sa.String(length=40), nullable=False, server_default="raw_cocoa"))
    op.create_index(op.f("ix_lots_product_type"), "lots", ["product_type"], unique=False)
    op.create_table(
        "transformation_outputs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("transformation_id", sa.Integer(), sa.ForeignKey("transformations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("lot_id", sa.Integer(), sa.ForeignKey("lots.id", ondelete="RESTRICT"), nullable=False, unique=True),
        sa.Column("quantity", sa.Numeric(14, 3), nullable=False),
        sa.UniqueConstraint("transformation_id", "lot_id", name="uq_transformation_output_lot"),
    )
    op.create_index("ix_transformation_outputs_transformation_id", "transformation_outputs", ["transformation_id"])
    op.create_index("ix_transformation_outputs_lot_id", "transformation_outputs", ["lot_id"])

    # Backfill the historical one-output transformations, retaining source origin.
    bind = op.get_bind()
    metadata = sa.MetaData()
    lots = sa.Table("lots", metadata, autoload_with=bind)
    transforms = sa.Table("transformations", metadata, autoload_with=bind)
    outputs = sa.Table("transformation_outputs", metadata, autoload_with=bind)
    movements = sa.Table("inventory_movements", metadata, autoload_with=bind)
    for transform in bind.execute(sa.select(transforms)).mappings():
        quantity = transform["output_quantity"]
        if quantity is None or quantity <= 0:
            continue
        source = bind.execute(sa.select(lots).where(lots.c.id == transform["lot_id"])).mappings().one()
        code = transform["output_code"]
        collision = bind.execute(sa.select(lots.c.id).where(lots.c.code == code)).first()
        if collision or len(code) > 40:
            suffix = f"-O{transform['id']}"
            code = f"{code[:40-len(suffix)]}{suffix}"
            bind.execute(transforms.update().where(transforms.c.id == transform["id"]).values(output_code=code))
        inserted = bind.execute(lots.insert().values(
            code=code,
            producer_id=source["producer_id"],
            farm_id=source["farm_id"],
            product_type="processed_cocoa",
            origin=source["origin"],
            received_on=transform["occurred_at"].date(),
            received_quantity=quantity,
            unit=transform["unit"],
            available_quantity=quantity,
            consumed_quantity=0,
            status=transform["output_status"],
            status_reason=transform["status_reason"],
            created_at=transform["created_at"] or datetime.now(timezone.utc),
        ))
        output_lot_id = inserted.inserted_primary_key[0]
        bind.execute(outputs.insert().values(
            transformation_id=transform["id"], lot_id=output_lot_id, quantity=quantity,
        ))
        bind.execute(movements.insert().values(
            lot_id=output_lot_id,
            transformation_id=transform["id"],
            reception_id=None,
            actor_id=transform["responsible_id"],
            reference=f"transformation:{transform['id']}:output:{output_lot_id}",
            movement_type="production",
            quantity=quantity,
            unit=transform["unit"],
            created_at=transform["created_at"] or datetime.now(timezone.utc),
        ))


def downgrade() -> None:
    # Retain materialized lots and their movements as historical inventory records.
    op.drop_index("ix_transformation_outputs_lot_id", table_name="transformation_outputs")
    op.drop_index("ix_transformation_outputs_transformation_id", table_name="transformation_outputs")
    op.drop_table("transformation_outputs")
    op.drop_index(op.f("ix_lots_product_type"), table_name="lots")
    op.drop_column("lots", "product_type")
