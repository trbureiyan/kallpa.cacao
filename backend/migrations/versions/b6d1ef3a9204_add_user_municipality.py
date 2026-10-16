"""Add the assigned municipality to demo users.

Revision ID: b6d1ef3a9204
Revises: e4219b1a7c30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b6d1ef3a9204"
down_revision: Union[str, None] = "e4219b1a7c30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("municipality", sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "municipality")
