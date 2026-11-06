# Qurilish CRM frontend

Next.js App Router, TypeScript, React, SWR va Lucide. Ish muhiti glassmorphic uslubda; shrift lokal paketdan yuklanadi.

## Ishga tushirish

```powershell
cd frontend
npm ci
npm run build
cd ../backend
uv run python -m app
```

Frontend backend manzilining `/` yo‘lida ishlaydi. Next.js static export `frontend/out` ichiga chiqadi; API bilan bir origin ishlatiladi. Alohida Next dev server kerak bo‘lsa `NEXT_PUBLIC_API_URL=http://127.0.0.1:8001` bilan `npm run dev` ishlating (backend CORS localhost:3000 ni ruxsat qilishi kerak).

## Arxitektura

- `src/app`: sahifa, metadata, global token va stil.
- `src/features`: auth, leads, catalog, team, audit, public domen modullari.
- `src/components`: ish muhiti va umumiy dialog, maydon, jadval holatlari.
- `src/lib`: typed modellar va yagona HTTP klient. Refresh so‘rovi bir vaqtda faqat bir marta yuboriladi. SWR keshi hisob almashganda tozalanadi.
- Katta ekran modullari talab bo‘yicha dynamic import qilinadi; mustaqil ma’lumotlar SWR orqali parallel olinadi.

## API qamrovi

Auth login/me/refresh/logout-all; CRM arizalar list/detail/stage/confirm-sale; katalog complexes list/detail/create/update/delete va apartments list/detail/create/update/delete; inventory narx o‘zgartirish va yaratish endpointlari; users list/create/deactivate; audit list; public majmualar va xonadonlar list/detail, ariza yuborish; health/ready. Katalogdagi create va inventory create endpointlari bir funksiyaning moslik uchun saqlangan ikkita marshrutidir; UI yaratishda inventory, tahrirlashda catalog ishlatadi. API hujjati `/docs`.

## Demo va testlar

Mahalliy `.env` dagi PostgreSQL foydalanuvchisida CREATEDB huquqi kerak:

```powershell
cd backend
$env:DEMO_PASSWORD = 'Qurilish-Demo-2026!'
uv run python prepare_test_db.py
uv run python run_demo.py
```

Alohida `course_crm_frontend_demo` va `course_crm_frontend_test` bazalari ishlatiladi. Mavjud ilova bazasiga seed yozilmaydi. Seed idempotent; demo slug: `ozod-demo`. Hisoblar: `demo.admin`, `demo.sotuvchi`, `demo.kuzatuvchi`. Parol `DEMO_PASSWORD` qiymati. Ular faqat mahalliy sinov uchun.

```powershell
cd frontend
npm run typecheck
npx playwright install chromium
npm test
```

Playwright test serverni o‘zi 18765 portida boshlaydi; qo‘lda ishlayotgan demo serverni avval to‘xtating. Brauzer testlari demo ma’lumotlariga qo‘shimcha sintetik yozuvlar kiritadi. Docker build loyiha ildizidan: `docker build -f backend/Dockerfile .`.
