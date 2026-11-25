# O‘zgarishlar tarixi

## 4.0.0 — 2026-11-25 · Ishchi tizim: onlayn to‘lov, jamoalar, xavfsizlik, joylashtirish
- **To‘lov:** Payme (Merchant API), Click (SHOP API), bank o‘tkazmasi (hisob-faktura PDF); 1/3/12 oylik davr, muddatidan oldin uzaytirish, qaytarish, fiskal chek havolasi, to‘lovlar tarixi, oferta.
- **Jamoa** (Firma, Tashkilot): taklif, o‘rinlar, umumiy kartoteka, mas’ul tayinlash, bir vaqtda tahrirlashni birlashtirish.
- **Hisob:** e-pochtani tasdiqlash, parolni tiklash, 2FA, qurilmalar, ma’lumotlarni yuklab olish, hisobni o‘chirish, admin jurnali.
- **Tuzatildi:** admin e-pochtasi bilan ro‘yxatdan o‘tib admin bo‘lish; shaxsiy sahifalarning service worker keshi; umumiy kompyuterda kabinet nusxasi qolishi va boshqa hisobga o‘tib ketishi; uzaytirganda qolgan kunlarning yo‘qolishi; nginx 64 KB chegarasi rasm yuklashni to‘sishi; ikki qurilmada kabinet ma’lumoti ustiga yozilishi.
- **Joylashtirish:** Docker Compose (Caddy HTTPS, PostgreSQL, kunlik zaxira, tiklash), `npm run check`, `npm run admin`, `/api/ready`.

## 3.14.0 — 2026-11-20 · PDF yuklash
- Jarima qarori, chek yoki buyruqni **PDF** sifatida ham yuklash mumkin (panel, sudrab tashlash, Ctrl+V).
- PDF brauzerning o‘zida pdf.js bilan ochiladi (o‘z serverimizdan, CDN yo‘q); PDF fayl serverga yuborilmaydi.
- Matnli PDF (Word’dan saqlangan, elektron hujjat): matn to‘g‘ridan-to‘g‘ri olinadi — OCR’siz, xatosiz, 1–2 soniyada.
- Skanerlangan PDF: birinchi 3 sahifa rasmga aylantirilib OCR qilinadi (AI kaliti bo‘lsa — barcha sahifalar bitta Claude so‘rovida).
- Parol bilan himoyalangan, buzilgan yoki 20 MB dan katta PDF uchun tushunarli xabarlar; ko‘p sahifali PDF’da qaysi sahifalar o‘qilgani aytiladi.
- Hujjat raqamlari «112-k», «45/sh» kabi harfli qo‘shimchalar bilan ham o‘qiladi.
- `/api/photo`: `images` (1–3 sahifa) va `{kind:"pdf", text}`; so‘rov chegarasi 8 MB, rasmlar jami 6 MB.
- Testlar: 83 unit + 12 brauzer testi (matnli va skanerlangan PDF namunalari bilan).

## 3.13.0 — 2026-11-20 · Bepul OCR: rasmdan o‘qish AI kalitisiz
- Hujjat rasmi AI kalitisiz ham o‘qiladi: serverning o‘zida Tesseract OCR (WebAssembly) — rus, o‘zbek lotin va o‘zbek kirill. Internet, tashqi xizmat va pul kerak emas; til fayllari npm paketlaridan.
- `server/docparse.js`: OCR matnidan qoidalar bilan hujjat turi, tashkilot, raqam, sana, summa, avtomobil raqami va sabab ajratiladi. OCR xatolariga chidamli: «№» → «Ne/WN:», «so‘m» → «5071.», «01 A» → «OLA», «S» → «$», lotin qatordagi adashgan kirill harflar («ПВВ» → «IIBB»).
- Hujjat turi aniq bo‘lsa holat to‘g‘ridan-to‘g‘ri tanlanadi (YHXX qarori → YHXX jarimasi, chek → sifatsiz tovar, bank xabari → karta…); fuqaro izoh yozsa — uning so‘zi ustun.
- AI kaliti bo‘lsa avval Claude o‘qiydi; AI xato bersa yoki o‘qiy olmasa — avtomatik OCR.
- Bosh sahifada doim ko‘rinadigan «Hujjat rasmi bormi?» paneli: rasm tanlash, sudrab tashlash, Ctrl+V; × bilan yopiladi (cookie — qayta yuklanganda ham yopiq), kamera tugmasi qayta ochadi.
- «Hujjatdan o‘qildi» kartasida o‘qish usuli (bepul OCR / Claude), past sifat ogohlantirishi va o‘qilgan matn.
- OCR bitta worker’da navbat bilan, 25 soniya chegarasi, osilsa qayta yaratiladi; `OCR=0` — o‘chirish.
- Testlar: 78 unit (OCR haqiqiy rasm namunalari bilan: telefon surati, rus tilidagi qaror, chek) + 11 brauzer testi.

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
