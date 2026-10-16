"""Persist the request fingerprint for transformation idempotency.

Revision ID: d843a91c5e2b
Revises: c2a7f4b89d10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d843a91c5e2b"
down_revision: Union[str, None] = "c2a7f4b89d10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("transformations", sa.Column("request_hash", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("transformations", "request_hash")
