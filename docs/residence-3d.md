# Majmua 3D

CRM menyusidagi **Majmua 3D** va ochiq katalogdagi shu nomli tab orqali foydalaniladi. Administrator bino va xonadonlarni yaratadi/tahrirlaydi; sotuvchi va kuzatuvchi ko‘radi. Ochiq katalogda mavjud xonadon uchun ariza yuborish mumkin.

Tashqi dizayn [Regnum Plaza](https://mbc.uz/project/regnum-plaza) reference’i asosida business-class yo‘nalishiga yangilandi: klinker, mis vertikal ramkalar, chuqur lodjiyalar, pergolali yashil hovli va yoritilgan kirish. **Dizayn konsepsiyasi** tugmasi imagegen bilan yaratilgan 4 bino/7 qavatli fotoreal taklifni ochadi. Bu rasm jonli inventar emas; bino/qavat/xonadon tanlash 3D maketda davom etadi. [Prompt va asset manbasi](business-class-design.md).

## Foydalanish

1. Majmuani tanlang. **Bino qo‘shish** orqali nomi, qavatlari, fasad rangi, eni/chuqurligi, X/Z koordinatalari va burilishini kiriting. Yangi majmua odatdagi **Xonadonlar → Majmualar** sahifasidan yaratiladi.
2. Maketdagi bino yoki pastdagi bino tugmasini bosing. Boshqa binolar tanlovni to‘smasligi uchun yashiriladi. Chapdagi qavat raqamini yoki model fasadini bosing. Qavat tanlanganda boshqa qavatlar yashiriladi, xonadonlar ochiq rangli maydon sifatida tanlanadi.
3. Xonadonni maket yoki o‘ngdagi ro‘yxatdan tanlang. Kamera mebel bilan jihozlangan **3D interyerga** yaqinlashadi: mehmonxona, oshxona, yotoq va hammom. Kameraga yaqin tashqi devorlar avtomatik yashiriladi; ichki devorlar past kesimda. Narx, maydon, xonalar, holat, planirovka va rasm o‘ng panelda. **Yuqoridan ko‘rish**, **Interyerni aylantirish**, **Ko‘rinishni tiklash** tugmalari mavjud. **Keyingi** qavatdagi navbatdagi xonadonga o‘tadi; **Narigi tomon** qarama-qarshi fasaddagi xonadonga kamerani olib boradi. Mos xonadon bo‘lmasa faqat kamera aylanadi.
4. Administrator **Xonadonni tahrirlash** orqali mavjud, binoga hali biriktirilmagan xonadonlarni joylashtiradi. Fasaddagi o‘rin tashqaridan qaraganda chapdan o‘ngga, 1 dan boshlab sanaladi; API’da 0 dan boshlanadi.
5. Rasm maydonlari HTTPS URL yoki loyiha ichidagi `/assets/...` manzilini oladi. O‘z rasmlaringizni `frontend/public/assets/`ga qo‘yib qayta build qiling yoki HTTPS media hosting manzilini kiriting. Rasmlarni bosib katta ko‘rish mumkin. Fayl yuklash/media hosting xizmati bu modul tarkibiga kirmaydi.

Yashil — mavjud; sariq — bron; qizil — sotilgan. Holat fasaddagi ingichka tasmada va matn bilan beriladi; shisha tabiiy to‘q rangini saqlaydi. Filtrlar ro‘yxatga va keyingi/oldingi navigatsiyaga ta’sir qiladi; maket barcha xonadonlarning real holatini ko‘rsatadi. Fasadda xonadon biriktirilmagan joylarga holat tasmasi qo‘yilmaydi va ular inventarga kiritilmaydi.

3D interyer va zaxira 2D planirovka xonalar soni/maydondan olinadigan bitta konsept rejadan tuziladi. O‘lchangan loyiha chizmasi sifatida ishlatilmaydi; aniq planirovka va interyer rasmlari alohida biriktiriladi. Kamera tanlov o‘lchamini ekran nisbatiga moslaydi, eng qisqa aylanish orqali 850 ms ichida o‘tadi. Reduced-motion yoqilganda animatsiya o‘chadi.

## Ma’lumotlar

- `21_residence` migratsiyasi `buildings` jadvali va `apartments`ga bino, qavat, fasad, o‘rin, maydon va rasm URLlarini qo‘shadi. Oldingi xonadonlar `building_id=NULL`, `area_m2=NULL` holatda qoladi; avtomatik taxminiy joylashtirilmaydi.
- Kompaniya/majmua/bino bog‘lanishi composite foreign key, fasad o‘rni unique constraint bilan tekshiriladi. API boshqa kompaniya binolarini ochmaydi. Binoda mavjud eng yuqori xonadon qavatidan past qavat sonini qo‘yish taqiqlanadi.
- Yozish uchun `inventory:write`, CRM ko‘rish uchun `leads:read`. Bino o‘zgarishlari auditga tushadi. Bron/sotilgan xonadonlarni tahrirlash bo‘yicha mavjud qoidalar saqlangan.
- Sotuv mavjud atomar `confirm-sale` jarayonida amalga oshiriladi. 3D oyna o‘sha `apartments` yozuvlarini ko‘rsatadi. 15 soniyali yangilanish va oynaga qaytganda revalidation ishlaydi. Tarmoq uzilganda eskirgan ma’lumot belgilanadi.

| Usul | Yo‘l | Vazifa |
|---|---|---|
| GET | `/api/v1/crm/residence/complexes` | Kompaniya majmualari |
| GET | `/api/v1/crm/residence/complexes/{id}` | Majmua, binolar va xonadonlar |
| GET | `/api/v1/companies/{slug}/residence/{id}` | Ochiq 3D katalog |
| POST | `/api/v1/crm/residence/complexes/{id}/buildings` | Bino yaratish |
| PUT, DELETE | `/api/v1/crm/residence/buildings/{id}` | Binoni tahrirlash/o‘chirish |
| POST, PATCH | `/api/v1/crm/catalog/apartments[/{id}]` | Xonadon va 3D atributlari |

## Ishga tushirish

Docker nashrida migratsiya avtomatik qo‘llanadi. Lokal ishga tushirishda:

```powershell
cd frontend
npm ci
npm run build
cd ../backend
uv run alembic upgrade head
uv run python -m app
```

Alohida lokal demo va test bazalari uchun PostgreSQL ishlayotgan bo‘lishi kerak:

```powershell
cd backend
$env:DEMO_PASSWORD='Qurilish-Demo-2026!'
uv run python prepare_test_db.py
uv run python run_demo.py
```

`prepare_test_db.py` faqat lokal `course_crm_frontend_demo` va `course_crm_frontend_test` bazalarini yaratadi/migratsiya qiladi. Ishchi baza o‘zgarmaydi. `app.seed_residence` idempotent, faqat `course_crm_` bazalarida ishlaydi. Demo: **Chinor Park · 3D namuna**, 4 bino × 7 qavat × 6 xonadon = 168 xonadon. Avvalgi demo majmualari o‘zgarmaydi. Testlar qo‘shimcha sintetik yozuvlar yaratishi mumkin.

Demo odatda `http://127.0.0.1:18765/`da. Port band bo‘lsa `DEMO_PORT` orqali boshqa port tanlanadi. Frontend E2E testlari ham shu o‘zgaruvchini qo‘llaydi.

## Tezlik va cheklovlar

Three.js faqat 3D sahifa ochilganda alohida chunk sifatida yuklanadi. Konstruksiya, daraxt va interyer mebellari `InstancedMesh`ga birlashtirilgan; React har kadrda yangilanmaydi. Lokal 256px material teksturalari, PBR yoritish, MSAA va GTAO kontakt soyasi ishlatiladi; 560px dan tor ekranda GTAO o‘chadi. Kamera yoki ma’lumot o‘zgarmasa RAF to‘xtaydi. Yashirin tab/viewport chizilmaydi. Pixel ratio 1.5 bilan cheklangan, soyalar faqat o‘zgarishda yangilanadi. Holat/narx yangilanishi geometriyani qayta yaratmaydi va kamerani siljitmaydi. Geometriya/material/texture/controls va kuzatuvchilar unmountda tozalanadi. API va katta resurslar gzip bilan siqiladi.

168 xonadonli demo ichidagi A-20 interyeri lokal Chromium tekshiruvida: **76 draw call**, **45 857 triangle** (postprocessing bilan). Kamera to‘xtagandan keyingi 500 ms ichida yangi kadrlar chizilmasligi tekshiriladi. Bu universal FPS kafolati emas. Ro‘yxat dastlabki 300 natijani ko‘rsatadi; bino/qavat/qidirish orqali qisqartiriladi. Backend snapshot majmuaning barcha xonadonlarini beradi.

Maket parametrik me’moriy vizualizatsiya: haqiqiy BIM/GLB geometriya importi yo‘q. Bino o‘lchami/joylashuvi bazadan olinadi; hovli va landshaft namuna. Aniq planirovka rasmi kiritilmasa, xonalar soniga mos **konsept reja** chiqadi. Maydoni noma’lum xonadon uchun panelda maydon to‘qilmaydi; konsept geometriya taxminiy o‘lcham ishlatadi. 3D interyer dasturiy geometrik konsepsiya, demo interyer rasmi esa AI namunasi; ikkalasi ham haqiqiy xonadonning o‘lchangan dizayni emas. Haqiqiy loyiha rasmlarini admin shaklida biriktirish mumkin.

Asos: [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html), [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html).

## Tekshiruvlar

`uv run ruff check app tests`; alohida PostgreSQL bazasida `uv run pytest`; `npm run typecheck`; `npm run build`; `npx playwright test`.

Backend testlari tenant chegaralari, rollar, noto‘g‘ri qavat/fasad/URL, takroriy joylashuv, band binoni o‘chirish, sotuvdan keyingi snapshot va eski xonadonlarni biriktirishni tekshiradi. Brauzer testlari bino/qavat/xonadon, orqa fasad, interyer, admin shakllari, jonli sotuvda kamera saqlanishi, mobil overflow, WebGL fallback va idle renderingni qamraydi. Yangi render testi to‘rt binoni ajratish, qavatdagi xonadonni canvas orqali tanlash, to‘rt tomondan aylanishda devorlar ochilishi va yuqoridan ko‘rishda kamera burchagini tekshiradi. Desktop/mobile screenshotlar vizual tekshirilgan.

2026-11-06 tekshiruvi: PostgreSQL bilan 14 backend testi o‘tgan; hi-tech render yangilanishidan so‘ng 11 mavjud brauzer testi va 1 yangi render testi, TypeScript va production build o‘tdi. Yangi testdagi bir xil nomli breadcrumb/qavat selektori aniqlashtirilib, shu test qayta muvaffaqiyatli o‘tkazildi. Brauzer sinovlari demo bazada ishlaydi. Asosiy/production bazaga demo yozilmadi va bu ish doirasida serverga deploy qilinmadi.

## Rasm manbasi

Asset: `frontend/public/assets/residence/interior-sample.webp` (1200×800). Built-in **imagegen** bilan yaratildi, loyiha uchun WebP formatida optimallashtirildi. Asli `.codex/generated_images`da. Faqat demo yozuvlarida ishlatiladi.

Yakuniy prompt:

> Use case: stylized-concept. Asset type: sample apartment interior visualization for an Uzbek residential real-estate CRM, landscape 3:2 image. Primary request: photorealistic architectural 3D visualization of a modern residential apartment living room opening into a dining and kitchen zone. Tasteful pale oak floor, off-white linen sofa, deep muted teal armchair, travertine coffee table, walnut cabinet, floor-to-ceiling windows overlooking leafy residential courtyard, beige plaster walls, a few natural plants. Wide architectural view at human eye level, physically plausible proportions and soft afternoon sunlight, detailed realistic surfaces, refined but attainable family apartment. No people, no text, no watermark. This is a clearly labeled illustrative interior sample, not a real property photo.
