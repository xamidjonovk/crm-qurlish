"""Create a local .env without replacing existing secrets."""
from pathlib import Path
import secrets

root = Path(__file__).resolve().parents[1]
target = root / ".env"
if target.exists():
    raise SystemExit(".env already exists; no changes made")
password = secrets.token_urlsafe(32)
token = secrets.token_urlsafe(48)
target.write_text(
    f"DATABASE_URL=postgresql+psycopg://crm_owner:{password}@127.0.0.1:5432/crm_course_v3\n"
    f"JWT_SECRET={token}\nPOSTGRES_DB=crm_course_v3\nPOSTGRES_USER=crm_owner\n"
    f"POSTGRES_PASSWORD={password}\nAPI_PORT=8001\n", encoding="utf-8"
)
print("Created .env. Keep this file private.")
