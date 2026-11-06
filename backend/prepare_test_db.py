import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.core.config import settings

os.chdir(Path(__file__).resolve().parent)

url = make_url(settings().database_url.get_secret_value())
if url.host not in ("localhost", "127.0.0.1"):
    raise SystemExit("Only local PostgreSQL is allowed")
for name in ("course_crm_frontend_demo", "course_crm_frontend_test"):
    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        if not conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname=:name"), {"name": name}
        ).scalar():
            conn.execute(text(f'CREATE DATABASE "{name}"'))
    admin.dispose()
    env = dict(
        os.environ,
        DATABASE_URL=url.set(database=name).render_as_string(hide_password=False),
    )
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"], env=env, check=True
    )
    if name.endswith("demo"):
        subprocess.run([sys.executable, "-m", "app.seed"], env=env, check=True)
        subprocess.run([sys.executable, "-m", "app.seed_residence"], env=env, check=True)
    else:
        env["TEST_DATABASE_URL"] = env["DATABASE_URL"]
        subprocess.run([sys.executable, "-m", "pytest", "-q"], env=env, check=True)
