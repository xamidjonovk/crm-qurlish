# Production deployment

Server boshqaruvi loyiha uchun cheklangan `sdp-crm-qurlish` SSH foydalanuvchisi orqali amalga oshiriladi. Production Compose: `docker-compose.prod.yml`; Compose project nomi: `sdp-crm-qurlish`. PostgreSQL porti hostga ochilmaydi, API `127.0.0.1:20000` da ishlaydi. Migratsiya alohida bir martalik xizmat orqali API’dan oldin bajariladi. Lokal Docker buyruqlari `docker-compose.yml` bilan ishlashda davom etadi.

Agent kaliti va SSH aliasi lokal sozlangach:

```powershell
ssh sdp-crm-qurlish sudo sdp status
ssh sdp-crm-qurlish sudo sdp ps
ssh sdp-crm-qurlish sudo sdp logs api --tail 100
ssh sdp-crm-qurlish sudo sdp validate
ssh sdp-crm-qurlish sudo sdp deploy --sha <commit-sha>
```

Repo `/srv/apps/crm-qurlish/repo` da; server `.env` fayli broker orqali yaratiladi va faqat root o‘qiydi. Lokal `.env` dagi SERVER/PAROL serverdagi ilova sozlamalariga uzatilmaydi. Parollar `sdp env-gen` orqali serverda yaratiladi. `sdp env-status` qiymatlarni chiqarmasdan holatini ko‘rsatadi.

Domen berilmaganda CORS ro‘yxati bo‘sh, ruxsat etilgan Host qiymatlari localhost va 127.0.0.1 bo‘ladi. HTTPS domen qo‘shilganda uning DNS yozuvi, nginx marshruti va ALLOWED_HOSTS/CORS_ORIGINS moslashtiriladi. SSH tunnel uchun port forwarding huquqi bor shaxsiy server akkauntingizdan foydalaning: `ssh -L 8002:127.0.0.1:20000 <your-user>@<server> -N`. Keyin `http://127.0.0.1:8002/docs` ni oching. Cheklangan agent/CI kalitlari tunnel uchun mo‘ljallanmagan.

GitHub Actions’da push test va image build bajaradi. Actions → Test, build and deploy → Run workflow orqali production deploy qo‘lda boshlanadi. `SDP_HOST`, `SDP_PORT`, `SDP_USER`, `SDP_SSH_KEY`, `SDP_KNOWN_HOSTS` repository secretlari kerak. CI kaliti faqat broker deploy buyrug‘ini ishga tushira oladi. Oddiy root SSH yoki umumiy Docker ruxsati CI’ga berilmaydi.

Schema o‘zgartirishdan oldin loyiha bazasining zaxirasini oling. Broker ilova release’ini rollback qilishi mumkin, lekin bazaga qo‘llangan migratsiyani orqaga qaytarmaydi. Production’da local `release.sh` va `backup.sh` o‘rniga broker orqali tasdiqlangan buyruqlardan foydalaning; ushbu eski yordamchilar oddiy lokal Compose uchun saqlangan.
