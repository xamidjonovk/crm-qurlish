# Construction CRM — 20-dars, 3-nashr
Python 3.11; PyCharm Terminal: uv sync --locked. .env.example nusxasini .env qiling.
19: uv run python -m crm.setup_database (admin DSN faqat shu buyruqqa).
19+: uv run alembic upgrade head. Faqat bo‘sh sintetik DB: uv run python -m crm.seed.
20+: uv run python -m crm.bootstrap — kompaniyaning birinchi admini.
uv run uvicorn crm.main:app --reload --host 127.0.0.1 --port 8001
21+: darsdagi Compose, Nginx, Certbot ketma-ketligini bajaring.
22+: MinIO litsenziya/bucket/key, Redis, Celery worker va bitta beat.
23+: web/ ichida npm ci, npm run dev; server sozlamalari web/.env.local.
3-nashr ichida 19 → 23 bir DB va upgrade head. Qayta seed qilmang.
Avvalgi nashr DBsini saqlang, 3-nashrni yangi DBda boshlang.
Testlar faqat course_crm_* nomli alohida disposable DBda.

Refresh: login returns access and refresh tokens. POST /api/v1/auth/refresh rotates the refresh token; replay revokes that login session. Run alembic upgrade head on existing databases.
