"""Expand, backfill, constrain: keep existing leads."""

import sqlalchemy as sa
from alembic import op

revision = "19_source"
down_revision = "19_catalog"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("leads", sa.Column("source", sa.String(30), nullable=True))
    op.execute("UPDATE leads SET source = 'web' WHERE source IS NULL")
    op.alter_column("leads", "source", nullable=False)


def downgrade():
    op.drop_column("leads", "source")
