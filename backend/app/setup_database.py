"""Explicit bootstrap command. API startup NEVER needs CREATEDB permission."""

import getpass
import os
import re

import psycopg
from dotenv import load_dotenv
from psycopg import sql
from sqlalchemy.engine import make_url


def main():
    load_dotenv()
    target = make_url(os.environ["DATABASE_URL"])
    if target.get_backend_name() != "postgresql":
        raise SystemExit("PostgreSQL URL required")
    name = target.database
    owner = target.username
    if not name or not re.fullmatch(r"[a-z][a-z0-9_]{2,62}", name):
        raise SystemExit("Use a simple lowercase DB name")
    if not owner:
        raise SystemExit("DATABASE_URL must name the existing migration owner role")
    admin_url = getpass.getpass("Admin PostgreSQL DSN (postgresql://.../postgres): ")
    admin = make_url(admin_url)
    if (admin.host, admin.port or 5432) != (target.host, target.port or 5432):
        raise SystemExit("Admin and target must use the same PostgreSQL server")
    with psycopg.connect(admin_url, autocommit=True) as connection:
        if (
            connection.execute(
                "SELECT 1 FROM pg_roles WHERE rolname=%s", (owner,)
            ).fetchone()
            is None
        ):
            raise SystemExit("Create the owner role first (lesson 19)")
        existing = connection.execute(
            "SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname=%s", (name,)
        ).fetchone()
        if existing:
            if existing[0] != owner:
                raise SystemExit("Existing database has another owner; nothing changed")
            print("Database already exists; no changes")
            return
        try:
            connection.execute(
                sql.SQL("CREATE DATABASE {} OWNER {}").format(
                    sql.Identifier(name), sql.Identifier(owner)
                )
            )
        except psycopg.errors.DuplicateDatabase:
            raise SystemExit(
                "Another bootstrap created the database; rerun to verify owner"
            ) from None
    print("Database created. Next: uv run alembic upgrade head")


if __name__ == "__main__":
    main()
