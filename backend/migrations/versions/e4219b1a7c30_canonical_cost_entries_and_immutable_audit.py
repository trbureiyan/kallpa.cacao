"""Use cost entries as the canonical cost ledger and protect audit history.

Revision ID: e4219b1a7c30
Revises: d843a91c5e2b
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e4219b1a7c30"
down_revision: Union[str, None] = "d843a91c5e2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _migrate_legacy_costs(bind) -> None:
    metadata = sa.MetaData()
    transformations = sa.Table("transformations", metadata, autoload_with=bind)
    outputs = sa.Table("transformation_outputs", metadata, autoload_with=bind)
    costs = sa.Table("cost_entries", metadata, autoload_with=bind)
    finance = sa.Table("finance_records", metadata, autoload_with=bind)

    for transform in bind.execute(sa.select(
        transformations.c.id,
        transformations.c.lot_id,
        transformations.c.costs_cop,
    )).mappings():
        # Preserve the amount the previous economics API actually exposed.
        already_migrated = bind.execute(sa.select(costs.c.id).where(
            costs.c.transformation_id == transform["id"], costs.c.category == "processing"
        )).first()
        if already_migrated:
            continue
        legacy_finance = bind.execute(sa.select(finance.c.total_cost_cop).where(
            finance.c.transformation_id == transform["id"]
        )).scalar_one_or_none()
        legacy_amount = legacy_finance if legacy_finance is not None else transform["costs_cop"]
        amount = Decimal(str(legacy_amount or 0)).quantize(Decimal("0.01"))
        if amount == 0:
            continue

        linked_outputs = list(bind.execute(
            sa.select(outputs.c.lot_id, outputs.c.quantity)
            .where(outputs.c.transformation_id == transform["id"])
            .order_by(outputs.c.id)
        ).mappings())
        if not linked_outputs:
            linked_outputs = [{"lot_id": transform["lot_id"], "quantity": Decimal("1")}]

        total_quantity = sum((Decimal(str(item["quantity"])) for item in linked_outputs), Decimal("0"))
        remaining = amount
        for index, output in enumerate(linked_outputs):
            if index == len(linked_outputs) - 1:
                allocated = remaining
            else:
                allocated = (amount * Decimal(str(output["quantity"])) / total_quantity).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                remaining -= allocated
            bind.execute(costs.insert().values(
                lot_id=output["lot_id"],
                transformation_id=transform["id"],
                category="processing",
                amount_cop=allocated,
            ))


def upgrade() -> None:
    bind = op.get_bind()
    _migrate_legacy_costs(bind)

    # The output Lot is authoritative; keep a code only for legacy zero-output records.
    op.drop_index("ix_transformations_output_status", table_name="transformations")
    op.drop_index("ix_transformations_output_code", table_name="transformations")
    with op.batch_alter_table("transformations") as batch_op:
        batch_op.alter_column("output_code", existing_type=sa.String(length=50), nullable=True)
    op.create_index("ix_transformations_output_code", "transformations", ["output_code"], unique=True)
    op.execute("""
        UPDATE transformations SET output_code = NULL
        WHERE id IN (SELECT transformation_id FROM transformation_outputs)
    """)
    op.drop_column("transformations", "output_status")
    op.drop_column("transformations", "status_reason")
    op.drop_column("transformations", "output_quantity")
    op.drop_column("transformation_outputs", "quantity")

    # The transformation keeps the sale price; stage costs live only in cost_entries.
    op.drop_column("transformations", "costs_cop")
    op.drop_table("finance_records")

    if bind.dialect.name == "postgresql":
        op.execute("""
            CREATE FUNCTION reject_audit_event_mutation() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'audit_events is append-only';
            END;
            $$ LANGUAGE plpgsql
        """)
        op.execute("""
            CREATE TRIGGER audit_events_no_update
            BEFORE UPDATE OR DELETE ON audit_events
            FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation()
        """)
    elif bind.dialect.name == "sqlite":
        op.execute("""
            CREATE TRIGGER audit_events_no_update
            BEFORE UPDATE ON audit_events
            BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END
        """)
        op.execute("""
            CREATE TRIGGER audit_events_no_delete
            BEFORE DELETE ON audit_events
            BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END
        """)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS audit_events_no_update ON audit_events")
        op.execute("DROP FUNCTION IF EXISTS reject_audit_event_mutation()")
    elif bind.dialect.name == "sqlite":
        op.execute("DROP TRIGGER IF EXISTS audit_events_no_update")
        op.execute("DROP TRIGGER IF EXISTS audit_events_no_delete")

    op.add_column("transformations", sa.Column("output_quantity", sa.Numeric(14, 3), nullable=False, server_default="0"))
    op.add_column("transformations", sa.Column("output_status", sa.String(length=20), nullable=False, server_default="pending"))
    op.add_column("transformations", sa.Column("status_reason", sa.String(length=500), nullable=True))
    op.add_column("transformation_outputs", sa.Column("quantity", sa.Numeric(14, 3), nullable=False, server_default="0"))
    op.add_column("transformations", sa.Column("costs_cop", sa.Numeric(16, 2), nullable=False, server_default="0"))
    op.create_table(
        "finance_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("transformation_id", sa.Integer(), sa.ForeignKey("transformations.id"), nullable=False, unique=True),
        sa.Column("total_cost_cop", sa.Numeric(16, 2), nullable=False),
        sa.Column("sale_price_cop_per_unit", sa.Numeric(16, 2), nullable=True),
    )
    bind = op.get_bind()
    metadata = sa.MetaData()
    transformations = sa.Table("transformations", metadata, autoload_with=bind)
    outputs = sa.Table("transformation_outputs", metadata, autoload_with=bind)
    lots = sa.Table("lots", metadata, autoload_with=bind)
    costs = sa.Table("cost_entries", metadata, autoload_with=bind)
    finance = sa.Table("finance_records", metadata, autoload_with=bind)
    linked_outputs = list(bind.execute(sa.select(
        outputs.c.transformation_id,
        outputs.c.lot_id,
        lots.c.code,
        lots.c.received_quantity,
        lots.c.status,
        lots.c.status_reason,
    ).join(lots, lots.c.id == outputs.c.lot_id).order_by(outputs.c.transformation_id, outputs.c.id)).mappings())
    grouped_outputs: dict[int, list] = {}
    for linked in linked_outputs:
        grouped_outputs.setdefault(linked["transformation_id"], []).append(linked)
        bind.execute(outputs.update().where(
            outputs.c.transformation_id == linked["transformation_id"],
            outputs.c.lot_id == linked["lot_id"],
        ).values(quantity=linked["received_quantity"]))
    for transformation_id, linked in grouped_outputs.items():
        bind.execute(transformations.update().where(
            transformations.c.id == transformation_id
        ).values(
            output_code=linked[0]["code"],
            output_quantity=sum((row["received_quantity"] for row in linked), Decimal("0")),
            output_status=linked[0]["status"],
            status_reason=linked[0]["status_reason"],
        ))
    op.drop_index("ix_transformations_output_code", table_name="transformations")
    with op.batch_alter_table("transformations") as batch_op:
        batch_op.alter_column("output_code", existing_type=sa.String(length=50), nullable=False)
    op.create_index("ix_transformations_output_code", "transformations", ["output_code"], unique=True)
    for transform in bind.execute(sa.select(
        transformations.c.id, transformations.c.sale_price_cop_per_unit
    )).mappings():
        total = bind.execute(sa.select(sa.func.coalesce(sa.func.sum(costs.c.amount_cop), 0)).where(
            costs.c.transformation_id == transform["id"], costs.c.category == "processing"
        )).scalar_one()
        bind.execute(transformations.update().where(transformations.c.id == transform["id"]).values(
            costs_cop=total
        ))
        bind.execute(finance.insert().values(
            transformation_id=transform["id"], total_cost_cop=total,
            sale_price_cop_per_unit=transform["sale_price_cop_per_unit"],
        ))
    op.create_index("ix_transformations_output_status", "transformations", ["output_status"])
