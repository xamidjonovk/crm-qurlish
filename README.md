# Construction CRM

FastAPI va PostgreSQL asosidagi CRM. Backend `backend/`, frontend `frontend/` ichida. Frontend API bilan bir manzildan ishlaydi.

**Majmua 3D**: tabiiy hi-tech bino → ochiq qavat → mebelli 3D interyer, to‘siqsiz kamera, jonli sotuv holatlari, planirovka, maydon/narx va admin boshqaruvi. [Foydalanish, migratsiya va demo qo‘llanmasi](docs/residence-3d.md).

## Docker bilan ishga tushirish

Docker Desktop va Compose kerak. Yangi loyiha uchun `python scripts/init_env.py` maxfiy qiymatlar bilan `.env` yaratadi va mavjud faylni ustiga yozmaydi. Agar `.env` oldindan mavjud bo‘lsa, unga `.env.example` dagi `POSTGRES_PASSWORD` ni qo‘shing. `JWT_SECRET` kamida 40 ta tasodifiy belgidan iborat bo‘lishi kerak. Compose paroli URL uchun xavfsiz belgilar: harflar, raqamlar, `-`, `_` dan iborat bo‘lsin.

Loyiha ildizida quyidagi buyruqlarni bajaring:

```powershell
# Image’larni yaratish yoki yangilash va konteynerlarni ishga tushirish
docker compose up -d --build

# Konteynerlarni to‘xtatish
docker compose down

# Holat va loglarni ko‘rish
docker compose ps
docker compose logs -f
```

Backend ishga tushganda `alembic upgrade head` avtomatik bajariladi. Migratsiya muvaffaqiyatsiz tugasa, API ishga tushmaydi. Birinchi administratorni yaratish uchun konteynerlar ishga tushgach quyidagini bir marta bajaring:

```powershell
docker compose run --rm api python -m app.bootstrap
```

Frontend: http://127.0.0.1:8001/; API hujjati: http://127.0.0.1:8001/docs. Development rejimi uchun `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` dan foydalaning; unda ham migratsiya avtomatik bajariladi. Migratsiyalarni bir vaqtning o‘zida bir nechta API nusxasida ishga tushirmang.

Administrator yaratish buyrug‘idan so‘ng uning hisobi bilan kiring. Xodimlarning huquqlari backend rollariga mos. Ochiq katalogni ko‘rish uchun kompaniya slug'i kerak. Brauzer seansi davomida tokenlar `sessionStorage`da saqlanadi; chiqish ushbu brauzerdagi tokenlarni tozalaydi. Barcha qurilmalardagi sessiyalarni bekor qilish uchun API’ning `logout-all` endpointidan foydalaning.

Ma’lumotlar `postgres_data` volume’da saqlanadi. PostgreSQL boshlang‘ich foydalanuvchisi, paroli va baza nomi faqat yangi volume’da qo‘llanadi; `.env` ni keyin o‘zgartirish mavjud bazani yangilamaydi. Compose API’ni faqat localhost’da ochadi. Serverga chiqarish uchun [deploy/README.md](deploy/README.md) ga qarang.

## Docker’siz

Python 3.11+ va uv kerak. `backend` katalogidan:

```powershell
uv sync --locked
uv run alembic upgrade head
uv run python -m app.bootstrap
uv run python -m app
```

`DATABASE_URL` va `JWT_SECRET` ildizdagi `.env` dan o‘qiladi. Baza avval mavjud bo‘lishi kerak; kerak bo‘lsa `uv run python -m app.setup_database` yordamida yaratiladi. `uv run python -m app.seed` faqat bo‘sh sintetik baza uchun. Eski nashr bazasini saqlang, revisionlarni majburan `stamp` qilmang.

## Tekshirish

`backend` katalogida `uv run ruff check app tests` va `uv run pytest` ni bajaring. PostgreSQL integratsion testi uchun `DATABASE_URL` va `TEST_DATABASE_URL` bir xil, `course_crm_` bilan boshlanuvchi alohida test bazasiga yo‘naltirilishi va unga avval `uv run alembic upgrade head` qo‘llanishi kerak. Test mavjud ilova bazasi uchun mo‘ljallanmagan.


## Next.js frontend va demo

Modulli Next.js frontend, API qamrovi, demo hisoblar va E2E tekshiruvlar uchun [frontend/README.md](frontend/README.md) ga qarang. Docker image Next.js production exportni avtomatik yaratadi. Lokal backendni ishga tushirishdan oldin `frontend` ichida `npm ci` va `npm run build` bajaring.
