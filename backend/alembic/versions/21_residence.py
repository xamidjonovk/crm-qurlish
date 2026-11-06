"""Buildings and apartment visualization metadata; existing inventory stays unassigned."""

import sqlalchemy as sa
from alembic import op

revision = "21_residence"
down_revision = "a52e4822a48c"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "buildings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("complex_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(60), nullable=False),
        sa.Column("floors", sa.Integer(), nullable=False, server_default="7"),
        sa.Column("x", sa.Float(), nullable=False, server_default="0"),
        sa.Column("z", sa.Float(), nullable=False, server_default="0"),
        sa.Column("rotation", sa.Float(), nullable=False, server_default="0"),
        sa.Column("width", sa.Float(), nullable=False, server_default="22"),
        sa.Column("depth", sa.Float(), nullable=False, server_default="14"),
        sa.Column("color", sa.String(7), nullable=False, server_default="#e5dfd2"),
        sa.UniqueConstraint("company_id", "complex_id", "id"),
        sa.UniqueConstraint("complex_id", "name"),
        sa.ForeignKeyConstraint(["company_id", "complex_id"], ["complexes.company_id", "complexes.id"]),
        sa.CheckConstraint("floors BETWEEN 1 AND 60", name="ck_building_floors"),
        sa.CheckConstraint("width >= 8 AND depth >= 8", name="ck_building_dimensions"),
    )
    op.create_index("ix_buildings_company_id", "buildings", ["company_id"])
    op.create_index("ix_buildings_complex_id", "buildings", ["complex_id"])
    for column in [
        sa.Column("building_id", sa.Integer(), nullable=True),
        sa.Column("floor", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("facade", sa.String(10), nullable=False, server_default="front"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("area_m2", sa.Float(), nullable=True),
        sa.Column("interior_url", sa.String(1000), nullable=True),
        sa.Column("floor_plan_url", sa.String(1000), nullable=True),
        sa.Column("visualization_note", sa.String(300), nullable=True),
    ]:
        op.add_column("apartments", column)
    op.create_foreign_key("fk_apartment_building", "apartments", "buildings", ["company_id", "complex_id", "building_id"], ["company_id", "complex_id", "id"])
    op.create_unique_constraint("uq_apartment_placement", "apartments", ["building_id", "floor", "facade", "position"])
    op.create_check_constraint("ck_apartment_placement", "apartments", "floor BETWEEN 1 AND 60 AND position BETWEEN 0 AND 11")
    op.create_check_constraint("ck_apartment_area", "apartments", "area_m2 IS NULL OR area_m2 > 0")
    op.create_check_constraint("ck_apartment_facade", "apartments", "facade IN ('front','back','left','right')")
    op.create_index("ix_apartment_scene", "apartments", ["company_id", "complex_id", "building_id"])


def downgrade():
    op.drop_index("ix_apartment_scene", "apartments")
    for name in ("ck_apartment_facade", "ck_apartment_area", "ck_apartment_placement", "uq_apartment_placement", "fk_apartment_building"):
        op.drop_constraint(name, "apartments")
    for name in ("visualization_note", "floor_plan_url", "interior_url", "area_m2", "position", "facade", "floor", "building_id"):
        op.drop_column("apartments", name)
    op.drop_table("buildings")
