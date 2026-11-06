# Qurilish CRM design system

## 3D katalog yo‘nalishi

Asosiy element — interaktiv turar joy maketi; atrofida tinch boshqaruv paneli. Mavjud Manrope va shaffof CRM karkasi saqlanadi. Palitra: osmon #dfe9ea, fasad #e5dfd2, matn #243f49, boshqaruv #245b65, mavjud #42b888, sotilgan #da6867; bron #e7ae48. Ma’lumot chapga tekislanadi. Katta maket + o‘ngda 302–330px inspector, pastda bino tanlash, maket ichida vertikal qavatlar. Mobilda inspector maket ostiga o‘tadi. Maket birinchi o‘rinda, KPI kartalari qo‘shilmaydi. Kamera harakati foydalanuvchi tanlovini tushuntiradi; uzluksiz avtomatik aylanish yo‘q. Bu umumiy dashboard emas, joylashuvni tushuntiradigan savdo interfeysi.

Tasdiqlangan yo‘nalish: foydalanuvchi so‘ragan glassmorphic web ish muhiti. Operate rejimi: asosiy vazifa savdo arizalari va xonadonlarni boshqarish.

## Tokens

Tashqi dizayn yangilanishi: foydalanuvchi bergan Regnum Plaza reference’i va imagegen konsepsiyasiga mos business-class arxitektura. Klinker #a48a6e, mis #aa6838, ohaktosh #c5b695, rom #26302c, o‘simlik #526537. Fasadda ikki qavatni birlashtiruvchi vertikal mis ramkalar, chuqur lodjiya va tom chetidagi o‘simliklar asosiy xarakter. Hovlida dumaloq yog‘och lamellali pergolalar, bog‘ orollari, sayr halqasi va mis kirish portali. Manrope va CRM panel tuzilishi saqlanadi; alohida **Dizayn konsepsiyasi** dialogi fotoreal namuna rasmini ochadi. Rasm interaktiv inventar sifatida ko‘rsatilmaydi. [Manba va imagegen prompti](docs/business-class-design.md).

3D maket tabiiy hi-tech me’moriy yo‘nalishda: tosh fasad, grafit rom, shisha balkon, yog‘och lamellar va ko‘kalamzor hovli. Holat ranglari ingichka fasad tasmalari bilan beriladi; butun bino yaltiroq yashil/qizil bo‘yalmaydi. Materiallar PBR, lokal teksturalar, muhit aksi, quyosh soyasi va kontakt soyalaridan foydalanadi. Tanlangan bino ajratiladi; qavatda boshqa qavatlar yashiriladi. Xonadonda kamera tomondagi tashqi devorlar ochilib, mebel bilan jihozlangan interyer ko‘rsatiladi. 2D reja va 3D interyer bir konsept geometriyasidan olinadi va haqiqiy loyiha sifatida ko‘rsatilmaydi. Kamera harakati 850 ms, reduced-motion holatida darhol; qayta markazlash va yuqoridan ko‘rish mavjud.

Foreground #18394a; secondary #536e7d; primary #145f74; ground #edf3f7; glass #ffffffa8; divider #cbdde480. Manrope Variable lokal. Sarlavha 29px, jadval 12px, asosiy matn 13px; mobile sarlavha 25px. Panel radius 16px, dialog 20px, kontrol 9px. Sidebar 250px, content padding 38px, tablet 24px, mobile 16px.

## Behavior

Shaffoflik tashqi panellar va dialoglarda; matn o‘qilishi ustuvor. Blur ishlamasa opaque fallback. Status faqat rang bilan emas, yozuv bilan ham ko‘rsatiladi. Jadval ichida gorizontal scroll; sahifa bo‘ylab overflow yo‘q. Keyboard focus 3px, reduced-motion qo‘llanadi. Rol navigatsiyani cheklaydi, backend barcha ruxsatlarni yana tekshiradi.
