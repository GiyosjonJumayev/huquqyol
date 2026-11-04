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
npm test                  # 14 ta test
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
test/              node:test — sana, reja, RAG, API, DOCX/PDF, AI (mock)
```

**Muhim tamoyil.** Muddat va pul hisob-kitobini LLM emas, kod bajaradi. LLM faqat matnni tasniflaydi va faktlarni ajratadi.

| Endpoint | Vazifa |
|---|---|
| `GET /api/meta` | holatlar ro‘yxati, AI holati |
| `POST /api/analyze` `{text}` | holat, ishonch darajasi, faktlar, topilgan normalar |
| `POST /api/plan` `{scenario, triggerDate, amount, months}` | muddat, xavf, qadamlar, kompensatsiya |
| `POST /api/document/preview` | hujjat bloklari (jonli ko‘rinish uchun) |
| `POST /api/document/docx` / `pdf` | tayyor fayl |

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
