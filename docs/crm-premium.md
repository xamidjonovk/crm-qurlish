# CRM boshqaruv paneli va mijoz aloqa tarixi

Dashboard kompaniyaga tegishli murojaatlarning UTC kunlari bo‘yicha 14/30 kunlik grafigi, joriy savdo bosqichlari va xonadonlar holatini ko‘rsatadi. So‘rovlar har 30 soniyada yangilanadi. Namuna murojaatlar soni alohida ko‘rsatiladi; ko‘rsatkichlarga ular ham kiradi.

Kanban savdo bosqichlari bo‘yicha 50 tadan sahifalaydi. Kartani tortish yoki ko‘chirish menyusi bilan bosqich o‘zgartiriladi. Mavjud versiya tekshiruvi, ruxsatlar va sotuvni atomar tasdiqlash qoidalari saqlanadi.

Mijoz kartasida telefon ilovasini ochish uchun `tel:` havolasi va faqat kompaniya xodimlari uchun ichki eslatmalar bor. Eslatmalar mijozga xabar sifatida yuborilmaydi, qo‘ng‘iroq telefon qurilmasida amalga oshiriladi; telefon provayderi yoki mijoz bilan real vaqt chat integratsiyasi mavjud emas. Namuna raqamlarga qo‘ng‘iroq tugmasi ko‘rsatilmaydi. `22_lead_notes` migratsiyasi eslatmalarni kompaniya va arizaga cheklaydi; yozish `leads:write` huquqini talab qiladi.

`python -m app.seed_dashboard --company <slug> --production` faqat mavjud `Chinor Park · 3D namuna` majmuasi uchun 36 ta aniq belgilangan sun’iy murojaat qo‘shadi. Takror ishga tushirish ma’lumotlarni ko‘paytirmaydi. Namuna mijozlar va summalar real savdo hisoboti deb qabul qilinmasligi kerak.
