# O‘zgarishlar tarixi

## 3.12.0 — 2026-11-20 · Hujjat rasmidan o‘qish
- Bosh sahifada «Rasmdan» tugmasi: jarima qarori, chek, buyruq, bank xabarnomasi yoki kommunal hisob rasmi tanlanadi.
- `POST /api/photo`: Claude vision rasmda ko‘rinib turgan faktlarni ajratadi — hujjat turi, kim chiqargani, raqami, sanasi, summasi, avtomobil raqami. Holat mavjud tahlil orqali tasniflanadi; muddat hujjat sanasidan kodda hisoblanadi, ariza maydonlari avtomatik to‘ladi.
- Rejada «Hujjatdan o‘qildi» kartasi — fuqaro o‘qilgan ma’lumotni asl hujjat bilan solishtiradi.
- Rasm brauzerda 1600 px gacha kichraytiriladi; serverda saqlanmaydi va logga yozilmaydi. Fayl turi birinchi baytlardan tekshiriladi, 3,5 MB chegarasi, alohida rate limit; boshqa API’larda 32 KB chegarasi o‘zgarmadi.
- AI kaliti bo‘lmasa tugma ko‘rinmaydi, API tushunarli 503 xabarini qaytaradi.
- 7 ta yangi test (jami 69).

## 3.11.0 — 2026-11-19 · Hakatonga tayyorgarlik
- README: muammo, yechim, raqamlar, skrinshotlar, arxitektura sxemasi, yo‘l xaritasi.
- DEMO.md: 3 daqiqalik pitch, 5 daqiqalik namoyish, zaxira reja, hakamlar savollari, sahnadan oldingi nazorat ro‘yxati.
- LICENSE, SECURITY.md, CHANGELOG.md; `docs/screenshots/`.
- Ijtimoiy tarmoqlar uchun to‘liq `og:image` / `og:url` (`PUBLIC_HOST` berilganda), `og:locale`.
- Tuzatish: anonim statistika fayli endi faqat server `start()` orqali ulanadi — testlar va skriptlar diskka yozmaydi.

## 3.10.0 — 2026-11-19 · Anonim statistika
- `/statistika` sahifasi va `GET /api/stats`: sohalar va holatlar bo‘yicha murojaatlar, hujjatlar, doiradan tashqari so‘rovlar, so‘nggi 30 kun.
- Matn, IP, cookie saqlanmaydi; takroriy sanash izi faqat xotirada va kunlik o‘chiriladi.

## 3.9.0 — 2026-11-19 · Qulaylik
- 4 darajali shrift o‘lchami (cookie bo‘yicha server tomonda qo‘llanadi).
- Matnlarni ovozli o‘qish (Web Speech API): belgilash, pauza, tezlik; o‘zbekcha ovoz bo‘lmasa rus ovozi.

## 3.8.0 — 2026-11-19 · Dalillar va «Qayerga borish»
- Har bir dalil: muhim/foydali va qayerdan olinishi.
- 13 ta idora kartasi rasmiy manbadan: manzil, telefon, onlayn murojaat, hududiy bo‘limlar.

## 3.7.0 — 2026-11-17 · 6 ta yangi soha
- Ijara, kommunal, bank va mikroqarz, yo‘l-transport, pensiya va nafaqa, mehnat migrantlari — 12 ta yangi holat.

## 3.6.0 — 2026-11-17 · Xavfsizlik
- Qat’iy CSP (`unsafe-inline` yo‘q), Fetch Metadata, Host tekshiruvi, umumiy API rate limit, service worker keshi relizga bog‘landi.

## 3.0–3.5 — 2026-11-05…06
- Uch til (o‘zbek lotin/kirill, rus), hosting (cPanel/VPS/Docker/Render), WCAG 2.2 AA, ovoz bilan kiritish, muqobil holat takliflari, kalendar eslatmasi.

## 1.0–2.1 — 2026-11-04…05
- MVP: qidiruv + Claude tahlili, reja, DOCX/PDF; 6 soha, 11 holat; shablon dvigateli, kalkulyatorlar, PWA, CI.
