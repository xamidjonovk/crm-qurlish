"""merge refresh with local users revision"""
from alembic import op
import sqlalchemy as sa
import sqlmodel

revision = 'a52e4822a48c'
down_revision = ('20_refresh', '8c25bbb61e91')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass
