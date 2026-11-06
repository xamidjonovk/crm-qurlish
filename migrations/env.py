from alembic import context
from sqlmodel import SQLModel

from crm import identity, models  # noqa: F401
from crm.db import engine

target_metadata = SQLModel.metadata
with engine().connect() as connection:
    context.configure(
        connection=connection, target_metadata=target_metadata, compare_type=True
    )
    with context.begin_transaction():
        context.run_migrations()
