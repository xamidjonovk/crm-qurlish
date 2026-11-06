"""Company-scoped internal lead notes."""

import sqlalchemy as sa
from alembic import op

revision = "22_lead_notes"
down_revision = "21_residence"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "lead_notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False
        ),
        sa.Column("lead_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("text", sa.String(2000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["company_id", "lead_id"], ["leads.company_id", "leads.id"]
        ),
    )
    op.create_index("ix_lead_notes_company_id", "lead_notes", ["company_id"])
    op.create_index("ix_lead_notes_lead_id", "lead_notes", ["lead_id"])


def downgrade():
    op.drop_table("lead_notes")
