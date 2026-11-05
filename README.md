# HuquqYo‘l — AI huquqiy yo‘l xaritasi

Fuqaro mehnat huquqi buzilganda muammosini oddiy tilda yozadi, tizim esa quyidagilarni beradi:

1. **Vaziyat tahlili.** Muammo qaysi holatga tegishli ekanini aniqlaydi.
2. **Tegishli normalar.** Mehnat kodeksi moddalarini oddiy tilda tushuntiradi va lex.uz manbasiga havola beradi.
3. **Qadamma-qadam reja.** Ish beruvchi → mehnat inspeksiyasi → sud, har biri muddati bilan.
4. **Xavf bahosi.** Sudga murojaat muddatigacha qolgan kunlarni, 333-modda bo‘yicha kompensatsiyani va kerakli dalillar ro‘yxatini ko‘rsatadi.
5. **Tayyor ariza.** Ish beruvchiga talabnoma, inspeksiyaga ariza yoki sudga da’vo arizasi. DOCX yoki PDF formatida yuklab olinadi.

MVP to‘rtta holatni qamraydi: ish haqi to‘lanmasligi, noqonuniy bo‘shatish, ta’til berilmasligi, bo‘shatishda hisob-kitob qilinmasligi.

## Ishga tushirish

Node.js 22.9 yoki undan yangi versiya kerak.

```bash
npm install
cp .env.example .env      # ANTHROPIC_API_KEY ni yozing (ixtiyoriy)
npm start                 # http://localhost:3000
npm test                  # 23 ta test
```

API kaliti bo‘lmasa ham ilova to‘liq ishlaydi. Bu holda tahlilni BM25 qidiruvi va kalit so‘zlar bajaradi. Kalit qo‘shilsa, tahlilni Claude bajaradi. Claude faqat qidiruv topgan normalarga tayanadi va bazada yo‘q modda raqamlari javobdan avtomatik olib tashlanadi.

Docker orqali:

```bash
docker build -t huquqyol .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... huquqyol
```

Bepul joylashtirish (Render, Railway): repo ulanadi, start buyrug‘i `npm start`, `ANTHROPIC_API_KEY` environment variable sifatida beriladi.

## Arxitektura

```
public/            Frontend: 3 ekran (Vaziyat → Reja → Ariza), freymvorksiz JS
server/
  index.js         Express API, rate limit, statik fayllar
  analyze.js       Tahlil: RAG konteksti → Claude (JSON) → validatsiya; xato bo‘lsa qoidalar
  rag.js           BM25 indeks: normalar + holatlar + (ixtiyoriy) lex.uz moddalari, sinonimlar
  plan.js          Muddat (MK 9-modda), xavf darajasi, 333-modda kompensatsiyasi
  documents.js     Hujjat modeli → ko‘rinish (JSON), DOCX (docx), PDF (pdfkit + DejaVu)
  kb/norms.json    Tekshirilgan normalar (oddiy tilda)
  kb/scenarios.json Holatlar: qadamlar, dalillar, muddatlar, hujjat turlari
scripts/ingest-lex.js  lex.uz sahifasini moddalarga bo‘lib, qidiruvga qo‘shadi
public/translit.js Lotin → kirill (brauzer va server uchun umumiy)
public/sw.js       Service worker: oflayn interfeys, API keshlanmaydi
test/              node:test — sana, reja, RAG, API, xavfsizlik, kirill, DOCX/PDF, AI (mock)
.github/workflows/ GitHub Actions: har push’da testlar va npm audit
```

**Muhim tamoyil.** Muddat va pul hisob-kitobini LLM emas, kod bajaradi. LLM faqat matnni tasniflaydi va faktlarni ajratadi.

| Endpoint | Vazifa |
|---|---|
| `GET /api/meta` | holatlar ro‘yxati, AI holati |
| `POST /api/analyze` `{text}` | holat, ishonch darajasi, faktlar, topilgan normalar |
| `POST /api/plan` `{scenario, triggerDate, amount, months}` | muddat, xavf, qadamlar, kompensatsiya |
| `POST /api/document/preview` | hujjat bloklari (jonli ko‘rinish uchun) |
| `POST /api/document/docx` / `pdf` | tayyor fayl |

## Xavfsizlik

- **HTTP headerlar.** Qat’iy CSP o‘rnatilgan: faqat o‘z domenidan skript va stil yuklanadi, tashqi CDN yo‘q, shriftlar ham o‘zimizda. Bundan tashqari `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy: no-referrer` va `Permissions-Policy` yoqilgan. Production rejimida HSTS ham ishlaydi.
- **Validatsiya.** Har bir maydonning turi, uzunligi va sanalari tekshiriladi. Noma’lum maydonlar tashlab yuboriladi. Boshqaruv va yo‘nalish belgilari (masalan, RLO) tozalanadi. `__proto__` kabi kalitlar ishlamaydi, chunki lug‘atlar prototipsiz (null-prototype).
- **So‘rovlar.** POST so‘rovlar faqat JSON formatida qabul qilinadi (aks holda 415). Tana hajmi 32 KB bilan cheklangan. Har bir endpoint uchun IP bo‘yicha rate limit qo‘yilgan.
- **AI himoyasi.** Fuqaro matni AI’ga alohida teg ichida beriladi va prompt injection’ga qarshi ko‘rsatma qo‘shilgan. AI javobi JSON sifatida tekshiriladi, bazada yo‘q modda raqamlari olib tashlanadi. AI so‘rovi 20 soniyadan oshsa to‘xtatiladi, xato bo‘lsa ilova qoidalar rejimiga o‘tadi.
- **Maxfiylik.** Foydalanuvchi matni va shaxsiy ma’lumotlari serverda saqlanmaydi va logga yozilmaydi. Brauzerda faqat `localStorage` da turadi va «Ma’lumotlarimni o‘chirish» tugmasi bilan o‘chiriladi.
- **Docker.** Konteyner root bo‘lmagan `node` foydalanuvchisi nomidan ishlaydi va healthcheck bilan ta’minlangan.
- Reverse proxy (Render, Nginx) ortida ishlatilsa, `TRUST_PROXY=1` o‘rnating, shunda rate limit haqiqiy IP bo‘yicha ishlaydi.

## Qulaylik

- Uch ekran (Vaziyat → Reja → Ariza) bor va brauzerning «orqaga» tugmasi ishlaydi.
- Sahifa yangilansa ham ish yo‘qolmaydi. Bosh sahifada «Davom etish» taklif qilinadi.
- Belgilangan dalillar arizaning «Ilovalar» ro‘yxatiga avtomatik qo‘shiladi.
- To‘ldirilmagan joylar hisoblab ko‘rsatiladi. Bossangiz, kerakli maydonga olib boradi.
- Ariza Word yoki PDF qilib yuklab olinadi, brauzerdan chop etiladi yoki matn sifatida nusxalanadi.
- Klaviatura bilan to‘liq boshqariladi, ekran o‘quvchi uchun e’lonlar (`aria-live`) bor, harakatni kamaytirish sozlamasi hurmat qilinadi.
- Qorong‘i va yorug‘ mavzu tizim sozlamasiga qarab avtomatik tanlanadi. Mobil qurilmada yuklab olish tugmalari ekran pastida turadi.
- **Lotin / Kirill.** Interfeys ham, DOCX/PDF arizalar ham o‘zbek kirill yozuvida chiqadi. Transliteratsiya (`public/translit.js`) o‘, g‘, sh, ch, ye, yo va tutuq belgisini to‘g‘ri o‘giradi va rus tilidan o‘zlashgan so‘zlarni ham hisobga oladi (inspeksiya → инспекция, kompensatsiya → компенсация). Lotinda kiritilgan ism ham kirill hujjatda kirillga o‘tadi.
- **O‘rnatiladigan ilova (PWA).** Telefonda «Bosh ekranga qo‘shish» mumkin. Internet uzilsa ham ilova ochiladi va saqlangan ish ko‘rinadi. Tahlil va hujjat yasash uchun aloqa kerak.
- **Accessibility.** axe-core tekshiruvida (WCAG 2.1 AA va best-practice qoidalari) uchala ekranda yorug‘ va qorong‘i mavzuda 0 ta xato.

## Qonun bazasini kengaytirish

1. https://lex.uz/acts/-6257288 sahifasini brauzerda oching va **Sahifani saqlash** (HTML) orqali saqlang.
2. `npm run ingest -- mehnat-kodeksi.html` buyrug‘ini ishga tushiring. Natijada `server/kb/lex-articles.json` (barcha moddalar) yaratiladi.
3. Serverni qayta ishga tushiring. Endi qidiruv moddalarning asl matnidan ham parcha topib, Claude’ga beradi.

Yangi holat qo‘shish uchun `kb/scenarios.json` ga yozuv, `kb/norms.json` ga kerakli normalar, `server/documents.js` ga esa ariza matni qo‘shiladi.

## Manbalar va cheklovlar

- O‘zbekiston Respublikasining Mehnat kodeksi (O‘RQ-798, 28.10.2022, 30.04.2023 dan kuchda): https://lex.uz/acts/-6257288
- Normalar 2026-yil noyabr holatiga tekshirilgan. 12-bob (hisob-kitob) va 171-modda bo‘yicha ma’lumotlar ikkilamchi manbalardan olingan, ularni lex.uz’da tasdiqlash tavsiya etiladi.
- 333-modda kompensatsiyasini hisoblash usuli amaliyotda bahsli. Shuning uchun ilova past talqinni asosiy summa sifatida, yuqori talqinni esa oraliq sifatida ko‘rsatadi. Markaziy bank stavkasi `CB_RATE` (default 14%) orqali o‘rnatiladi.
- **Bu huquqiy maslahat emas.** Ilova ma’lumot beradi va hujjat loyihasini tayyorlaydi.
