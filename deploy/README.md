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

## IP va port orqali kirish

Tashqi HTTP port: `20001`. Host Nginx’dagi `/etc/nginx/conf.d/crm-qurlish-port.conf` faqat ushbu loyiha uchun `127.0.0.1:20000` ga proxy qiladi; namuna `nginx-port.conf.example` da. Server IP’si `ALLOWED_HOSTS` ga kiritiladi. Manzil: `http://<server-ip>:20001/docs`. Bu port HTTP orqali ishlaydi; domen/TLS keyinchalik alohida sozlanadi. Konfiguratsiya o‘zgartirilganda avval `nginx -t`, so‘ng graceful reload bajariladi. Ushbu listener Docker Compose emas, host Nginx orqali boshqariladi.

## api.crmdev.uz va HTTPS

`api.crmdev.uz` Nginx orqali `127.0.0.1:20000` ga bog‘langan. DNS tarqalishini kutish uchun `crm-qurlish-https-setup.service` loyiha foydalanuvchisi ostida bir marta ishlaydi: har 5 daqiqada yozuvlarni tekshiradi, eng ko‘pi 12 soat kutadi. Faqat barcha A/AAAA manzillar shu serverga tegishli bo‘lsa, loyiha brokerining `tls` buyrug‘ini chaqiradi. Certbot staging sinovi muvaffaqiyatidan keyin haqiqiy sertifikat olinadi, HTTP → HTTPS yoqiladi va `/ready` tekshiriladi. Boshlang‘ich sertifikat olishning production bosqichidagi xato avtomatik qayta urinilmaydi.

Holatini ko‘rish:

```powershell
ssh sdp-crm-qurlish cat /var/lib/crm-qurlish-https/status.json
ssh sdp-crm-qurlish sudo sdp domains
```

`completed` HTTPS ishlashini tekshirilganini bildiradi; `waiting_for_dns` DNS hali tayyor emasligini bildiradi. Kutish muddati tugasa `dns_wait_expired` yoziladi. Administrator muammoni hal qilgach, yakunlangan eski holat faylini ko‘rib chiqib, faqat ushbu setup xizmatini qayta ishga tushirishi mumkin; `deadline` saqlangani uchun muddati o‘tgan faylni zaxiralab olib tashlamasdan qayta start yangi kutish oynasini yaratmaydi.

Sertifikat yangilanishi uchun faqat `api.crmdev.uz` va `crmdev.uz` ga xizmat qiladigan `crm-qurlish-cert-renew.timer` kunlik yoqilgan. U sertifikat mavjud bo‘lgach Certbot renewal bajaradi va muvaffaqiyatli yangilanganda Nginx’ni sintaksis tekshiruvidan keyin graceful reload qiladi. Boshqa loyihalarning renewal sozlamalari o‘zgartirilmaydi. Servislar uchun administrator diagnostikasi: `systemctl status crm-qurlish-https-setup.service` va `journalctl -u crm-qurlish-https-setup.service`.

ACME webroot: `/var/www/sdp-acme/.well-known/acme-challenge`. Ushbu uch katalog Nginx o‘qishi uchun `0755` ruxsatida yaratilgan; challenge fayllari ommaviy o‘qilishi mumkin bo‘lishi kerak. Vaqtinchalik probe fayli server IP’si va `Host: api.crmdev.uz` orqali tashqaridan `200` javob va to‘g‘ri kontent bilan tekshirilgan, so‘ng o‘chirilgan. Sertifikatning maxfiy kalitlari bu webroot ichiga yozilmaydi.

## HTTPS marshrutlarini ajratish

`crmdev.uz` va `api.crmdev.uz` shu backend’ga ulanadi; frontend bosh sahifada, API hujjatlari esa `/docs` manzilida ochiladi. Frontend backend image ichiga yig‘iladi va API bilan bir origin orqali ishlaydi. CertID o‘zining mavjud `certid.uz`/`www.certid.uz` domenlarida qoladi. Nginx’ga noma’lum HTTPS domenlari uchun alohida default reject bloki qo‘shilgan: ular CertID sahifasiga tushmaydi.

CRM’ning ikki domeni IPv4 A yozuvlari orqali ishlaydi. Ushbu loyiha broker marshrutlarida IPv6 listener o‘chirilgan (`ipv6: false`), chunki serverning Tailscale xizmati alohida IPv6 443 soketidan foydalanadi. Boshqa loyihalar yoki Tailscale sozlamalari o‘zgartirilmaydi.

Snap Certbot `/root/snap` katalogidan foydalanadi; setup xizmatiga `ProtectHome=true` yoki `PrivateTmp=true` qo‘llanmaydi. Xizmat loyiha foydalanuvchisi ostida ishlaydi va faqat cheklangan broker orqali sertifikat amallarini bajaradi. Ikkinchi domen uchun `crm-qurlish-root-https-setup.service` va `/var/lib/crm-qurlish-root-https/status.json` mavjud. CA tarafida DNS keshi eski bo‘lsa faqat staging tekshiruvi takrorlanadi; production issuance xatosi takrorlanmaydi. Renewal xizmati faqat CRM’ning ikki sertifikatini yangilaydi.


## Frontend bilan yagona Compose release

`backend/Dockerfile` ikki bosqichda yig‘iladi: Node 22 Next.js static exportni yaratadi, keyin natija Python image ichiga ko‘chiriladi. Alohida frontend jarayoni talab qilinmaydi: `api` Compose xizmati `/` va `/_next` orqali frontendni, `/api/v1` orqali backendni beradi. `crmdev.uz` shu xizmatdagi frontendni ochadi. `API_ONLY_HOSTS=["api.crmdev.uz"]` API domeni bosh sahifasini `/docs` ga yo‘naltiradi. Frontenddan so‘rovlar shu origin ichidagi `/api/v1` ga ketadi.

Lokal: `docker compose up -d --build`. Production: `docker-compose.prod.yml` va `sdp-crm-qurlish` Compose projecti. Build uchun npm lockfile ishlatiladi; tayyor image ishga tushganda Node/npm yoki tashqi font xizmatiga bog‘liq emas.
