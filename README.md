# HuquqYo‘l — AI huquqiy yo‘l xaritasi

Fuqaro muammosini oddiy tilda yozadi yoki sohani tanlaydi. Tizim vaziyatni tahlil qiladi va quyidagilarni beradi: tegishli qonun normalari (lex.uz havolasi bilan), qadamma-qadam reja, muddat va xavf bahosi, kalkulyator, hamda tayyor ariza. Ariza DOCX, PDF yoki chop etish uchun tayyor holatda chiqadi.

**Uch tilda ishlaydi:** o‘zbek (lotin), o‘zbek (kirill) va rus. Til interfeys, normalar matni, qadamlar, kalkulyatorlar, xato xabarlari va tayyor arizaga birdek tatbiq etiladi. Rus tilidagi ariza ruscha rasmiy uslubda yoziladi («ИСКОВОЕ ЗАЯВЛЕНИЕ», «На основании изложенного прошу:»). Vaziyatni istalgan tilda yozish mumkin, jumladan o‘zbekcha kirillda.

Vaziyatni ovoz bilan aytish mumkin (brauzer qo‘llasa). Tahlil noaniq bo‘lsa, ilova yaqin holatlarni taklif qiladi va bir bosishda almashtiradi. Rejadagi muddatni bir tugma bilan telefon kalendariga eslatma (.ics, 3 kun oldin va oxirgi kun) qilib qo‘shish, rejani alohida chop etish mumkin.

Taqdimot ssenariysi va hakamlar savollariga javoblar — [DEMO.md](DEMO.md). Hostingga joylashtirish (cPanel, VPS, Docker, Render) — [DEPLOY.md](DEPLOY.md).

## Qamrab olingan sohalar (6 soha, 11 holat)

| Soha | Holatlar | Asosiy manba | Muddat | Kalkulyator | Arizalar |
|---|---|---|---|---|---|
| Mehnat | Ish haqi to‘lanmasligi; noqonuniy bo‘shatish; ta’til berilmasligi; bo‘shatishda hisob-kitob | Mehnat kodeksi (O‘RQ-798) | 3 yoki 6 oy | MK 333-modda kompensatsiyasi | Ish beruvchi, mehnat inspeksiyasi, sud |
| Iste’molchi | Sifatsiz tovar; sifatli tovarni qaytarish | Iste’molchilar huquqlari to‘g‘risidagi qonun (221-I), 13–18, 22, 29-moddalar | Kafolat muddati / 6 oy; 10 kun | Penya: narxning 1%i × kechikkan kun | Sotuvchi, Raqobat va iste’molchilar qo‘mitasi, sud |
| Oila | Aliment undirish | Oila kodeksi, 96, 99, 136-moddalar | Muddatsiz (OK 12-modda) | 1/4 · 1/3 · 1/2 ulush, eng kam miqdor | Sud |
| Davlat idoralari | Javobsiz murojaat; noqonuniy qaror | Murojaatlar to‘g‘risidagi qonun (6, 28, 36-moddalar); ma’muriy sud | 15 kun + 6 oy; 6 oy | — | Yuqori organ, ma’muriy sud |
| Jarimalar | Ma’muriy jarimaga shikoyat | MJtK (10 kunlik shikoyat muddati, 332¹-modda chegirmasi) | 10 kun | 50% / 70% chegirma sanalari bilan | Yuqori organ, sud |
| Qarz | Qarzni undirish | Fuqarolik kodeksi, 150, 732-moddalar | 3 yil | — | Qarzdor, sud |

## Ishga tushirish

Node.js 18.18 yoki undan yangi versiya kerak (tavsiya: 20 yoki 22).

```bash
npm install
cp .env.example .env      # ANTHROPIC_API_KEY ni yozing (ixtiyoriy)
npm start                 # http://localhost:3000
npm test                  # 45 ta unit/API test (jumladan ruscha va kirillcha)
npm run test:e2e          # 6 ta brauzer testi (Playwright kerak: npm i --no-save playwright)
```

API kaliti bo‘lmasa ham ilova to‘liq ishlaydi. Bu holda tahlilni BM25 qidiruvi va kalit so‘zlar bajaradi. Kalit qo‘shilsa, tahlilni Claude bajaradi. Claude faqat qidiruv topgan normalarga tayanadi va bazada yo‘q modda raqamlari javobdan avtomatik olib tashlanadi.

Docker orqali:

```bash
docker build -t huquqyol .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... huquqyol
```

Bepul joylashtirish: Render’da repo ulanadi, `render.yaml` hamma narsani o‘zi sozlaydi (faqat `ANTHROPIC_API_KEY` ni kiriting). Railway va boshqa platformalarda start buyrug‘i `npm start`.

## Arxitektura

```
public/            Frontend: 3 ekran (Vaziyat → Reja → Ariza), freymvorksiz JS
server/
  index.js         Express API, rate limit, statik fayllar
  analyze.js       Tahlil: RAG konteksti → Claude (JSON) → validatsiya; xato bo‘lsa qoidalar
  rag.js           BM25 indeks: normalar + holatlar + (ixtiyoriy) lex.uz moddalari, sinonimlar
  plan.js          Muddatlar (kun/oy/yil, offset, muddatsiz), xavf darajasi, 4 xil kalkulyator
  documents.js     Shablon dvigateli → hujjat modeli → ko‘rinish (JSON), DOCX (docx), PDF (pdfkit + DejaVu)
scripts/build-kb.py    Bilim bazasining manbasi: yangi soha va holatlar shu yerda qo‘shiladi
  kb/*.json        Bilim bazasi: laws, domains, norms, scenarios (shablonli hujjatlar), applicant
  validate.js      Har bir holat maydonlarining spetsifikatsiyasi bo‘yicha tekshiruv
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

- **HTTP headerlar.** Qat’iy CSP o‘rnatilgan: faqat o‘z domenidan skript va stil yuklanadi, tashqi CDN yo‘q, shriftlar ham o‘zimizda. Bundan tashqari `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy: no-referrer` va `Permissions-Policy` yoqilgan. Production rejimida HSTS ham ishlaydi. Permissions-Policy: kamera, joylashuv va to‘lov yopiq; mikrofon faqat o‘z saytiga (ovoz bilan kiritish uchun).
- **Validatsiya.** Har bir maydonning turi, uzunligi va sanalari tekshiriladi. Noma’lum maydonlar tashlab yuboriladi. Boshqaruv va yo‘nalish belgilari (masalan, RLO) tozalanadi. `__proto__` kabi kalitlar ishlamaydi, chunki lug‘atlar prototipsiz (null-prototype).
- **So‘rovlar.** POST so‘rovlar faqat JSON formatida qabul qilinadi (aks holda 415). Tana hajmi 32 KB bilan cheklangan. Boshqa saytdan kelgan so‘rov rad etiladi (Origin tekshiruvi, 403). Har bir endpoint uchun IP bo‘yicha rate limit qo‘yilgan.
- **AI himoyasi.** Fuqaro matni AI’ga alohida teg ichida beriladi va prompt injection’ga qarshi ko‘rsatma qo‘shilgan. AI javobi JSON sifatida tekshiriladi, bazada yo‘q modda raqamlari olib tashlanadi. AI so‘rovi 20 soniyadan oshsa to‘xtatiladi, xato bo‘lsa ilova qoidalar rejimiga o‘tadi.
- **Maxfiylik.** Foydalanuvchi matni va shaxsiy ma’lumotlari serverda saqlanmaydi va logga yozilmaydi. Brauzerda faqat `localStorage` da turadi va «Ma’lumotlarimni o‘chirish» tugmasi bilan o‘chiriladi.
- **Docker.** Konteyner root bo‘lmagan `node` foydalanuvchisi nomidan ishlaydi va healthcheck bilan ta’minlangan.
- Reverse proxy (Render, Nginx) ortida ishlatilsa, `TRUST_PROXY=1` o‘rnating, shunda rate limit haqiqiy IP bo‘yicha ishlaydi.

## Tezlik

Lighthouse (production rejim): **Performance 100, Accessibility 100, Best Practices 100, SEO 100**. Ko‘rsatkichlar: FCP 0,9 s, LCP 1,2 s, CLS 0, TBT 0 ms.
- Bosh sahifa serverda oldindan chiziladi: soha kartalari va meta-ma’lumot HTML ichida keladi, sahifa ochilganda tarkib siljimaydi.
- CSS/JS fayllar kontent xeshi bilan versiyalanadi (`?v=…`) va bir yil keshlanadi; HTML har safar tekshiriladi.
- Barcha matnli javoblar gzip bilan siqiladi; shriftlar alfavit bo‘yicha bo‘lib yuklanadi.

## Qulaylik

- Uch ekran (Vaziyat → Reja → Ariza) bor va brauzerning «orqaga» tugmasi ishlaydi.
- Sahifa yangilansa ham ish yo‘qolmaydi. Bosh sahifada «Davom etish» taklif qilinadi.
- Belgilangan dalillar arizaning «Ilovalar» ro‘yxatiga avtomatik qo‘shiladi.
- Bosh sahifada asosiy amal birinchi turadi: vaziyatni yozish, undan keyin soha tanlash. Bitta holatli soha to‘g‘ridan-to‘g‘ri rejani ochadi.
- Rejada «Ariza tayyorlash» tugmasi doim ko‘rinib turadi. Muddat hisoblanadigan sana yonida uni tekshirish eslatmasi bor.
- To‘ldirilmagan joylar hisoblab ko‘rsatiladi, to‘ldirish chizig‘i bilan. Bossangiz, kerakli maydonga olib boradi. Majburiy maydonlar `*` bilan belgilanadi.
- Ariza Word yoki PDF qilib yuklab olinadi, brauzerdan chop etiladi yoki matn sifatida nusxalanadi.
- **«Qanday topshiriladi» yo‘riqnomasi** har bir qabul qiluvchi uchun alohida: qabul belgisi, buyurtma xat, elektron yo‘llar (sudlar uchun my.sud.uz, davlat idoralari uchun Prezidentning virtual qabulxonasi, YHXX jarimalari uchun my.gov.uz), davlat boji.
- Klaviatura bilan to‘liq boshqariladi, ekran o‘quvchi uchun e’lonlar (`aria-live`) bor, harakatni kamaytirish sozlamasi hurmat qilinadi.
- Qorong‘i va yorug‘ mavzu tizim sozlamasiga qarab avtomatik tanlanadi. Mobil qurilmada yuklab olish tugmalari ekran pastida turadi.
- **Lotin / Kirill.** Interfeys ham, DOCX/PDF arizalar ham o‘zbek kirill yozuvida chiqadi. Transliteratsiya (`public/translit.js`) o‘, g‘, sh, ch, ye, yo va tutuq belgisini to‘g‘ri o‘giradi va rus tilidan o‘zlashgan so‘zlarni ham hisobga oladi (inspeksiya → инспекция, kompensatsiya → компенсация). Lotinda kiritilgan ism ham kirill hujjatda kirillga o‘tadi.
- **O‘rnatiladigan ilova (PWA).** Telefonda «Bosh ekranga qo‘shish» mumkin. Internet uzilsa ham ilova ochiladi va saqlangan ish ko‘rinadi. Tahlil va hujjat yasash uchun aloqa kerak.
- **Accessibility.** axe-core tekshiruvida (WCAG 2.2 AA va best-practice qoidalari) uchala ekranda yorug‘ va qorong‘i mavzuda 0 ta xato. Xato matnlari maydonlarga `aria-describedby` bilan bog‘langan, teginish maydonlari kamida 44px, sahifa 320px kenglikda gorizontal siljimaydi, yuqori kontrast rejimi hisobga olingan. Bu avtomatik tekshiruv; ekran o‘quvchi bilan qo‘lda sinov o‘tkazilmagan.
- **Xatoning oldini olish.** Ma’lumotni o‘chirish tasdiq so‘raydi (Esc yoki «Bekor qilish» bilan qaytish mumkin). Bo‘sh joylar bor ariza yuklab olinishidan oldin ogohlantirish ko‘rsatiladi.

## Qonun bazasini kengaytirish

1. https://lex.uz/acts/-6257288 sahifasini brauzerda oching va **Sahifani saqlash** (HTML) orqali saqlang.
2. `npm run ingest -- mehnat-kodeksi.html` buyrug‘ini ishga tushiring. Natijada `server/kb/lex-articles.json` (barcha moddalar) yaratiladi.
3. Serverni qayta ishga tushiring. Endi qidiruv moddalarning asl matnidan ham parcha topib, Claude’ga beradi.

### Yangi soha yoki holat qo‘shish

Kod yozish shart emas. `scripts/build-kb.py` faylida quyidagilar qo‘shiladi:

1. `norm(...)` — qonun normasi: qaysi qonun, modda, sarlavha va oddiy tildagi izoh.
2. `scen(...)` — holat: kalit so‘zlar, normalar, muddat (`days`, `months`, `years`, `offsetDays` yoki `none`), qadamlar, dalillar, maydonlar va ariza shablonlari.
3. `python3 scripts/build-kb.py server/kb` buyrug‘i bilan bilim bazasi qayta yaratiladi, keyin `npm test`.

Generator va testlar har bir shablondagi `{{kalit}}` maydonlarda mavjudligini avtomatik tekshiradi.

Shablon sintaksisi:
- `{{fio}}` — maydon qiymati. Bo‘sh bo‘lsa, hujjatda «to‘ldirilmagan joy» bo‘lib chiqadi.
- `{{applicant}}` — F.I.Sh., manzil va telefon birga.
- `[?price] ... [/]` — maydon to‘ldirilgan bo‘lsagina chiqadi; `[!price] ... [/]` — to‘ldirilmagan bo‘lsagina chiqadi.
- Hisoblanadigan qiymatlar: `{{trigger}}`, `{{deadline}}`, `{{deadlineTerm}}`, `{{share}}` (aliment ulushi), `{{demandCourt}}` (tanlovning sud uchun iborasi).


## Manbalar va cheklovlar

- O‘zbekiston Respublikasining Mehnat kodeksi (O‘RQ-798, 28.10.2022, 30.04.2023 dan kuchda): https://lex.uz/acts/-6257288
- Normalar 2026-yil noyabr holatiga tekshirilgan. Quyidagilar ikkilamchi rasmiy manbalardan (gov.uz/advice, norma.uz, kun.uz) olingan, ularni lex.uz’dagi asl matn bilan tasdiqlash tavsiya etiladi:
  - MK 12-bob (hisob-kitob) va 171-modda;
  - MJtK bo‘yicha jarimaga shikoyat qilishning 10 kunlik muddati (O‘RQ-884, 2024-yildan): modda raqami ko‘rsatilmagan.
- 2026-yil noyabrda qo‘shimcha tasdiqlanganlar:
  - Oila kodeksi 99-modda sarlavhasi (lex.uz), ulushlar va eng kam miqdor (gov.uz/advice va kun.uz mos keladi; `MIN_ALIMONY` orqali o‘zgartiriladi);
  - ma’muriy sudga murojaatning 6 oylik muddati va jismoniy shaxslar uchun davlat boji yo‘qligi (uza.uz, gov.uz/advice);
  - sudga elektron murojaat — my.sud.uz (gov.uz/advice);
  - YHXX jarimasi ustidan my.gov.uz orqali elektron shikoyat (kursiv.media).
- 333-modda kompensatsiyasini hisoblash usuli amaliyotda bahsli. Shuning uchun ilova past talqinni asosiy summa sifatida, yuqori talqinni esa oraliq sifatida ko‘rsatadi. Markaziy bank stavkasi `CB_RATE` (default 14%) orqali o‘rnatiladi.
- **Bu huquqiy maslahat emas.** Ilova ma’lumot beradi va hujjat loyihasini tayyorlaydi.

## Ko‘p tillilik

| Qatlam | Qanday ishlaydi |
|---|---|
| Til tanlash | Ustuvorlik: so‘rovdagi `lang` → `?lang=` → `hy_lang` cookie → brauzer tili (`Accept-Language`) → o‘zbek. `/?lang=ru` havolasi tilni eslab qoladi |
| Bosh sahifa | Har bir til uchun serverda alohida chiziladi (`{{kalit}}` → `public/i18n.js`), shuning uchun matn «sakramaydi» |
| Bilim bazasi | `scripts/kb_ru.py` — ruscha matnlar; generator ularni o‘zbekcha baza bilan tuzilma bo‘yicha solishtiradi (maydonlar, shablon kalitlari, hujjatlar soni) va `server/kb/ru.json` yozadi |
| Kirill | O‘zbekcha natijadan avtomatik o‘giriladi (`public/translit.js`); identifikatorlar, URL va sanalar o‘zgarmaydi |
| Qidiruv | Ruscha kalit so‘zlar bazaga qo‘shilgan; kirillcha o‘zbek matni qidiruv uchun lotinga ham o‘giriladi |
| AI | Claude `summary` va `missing` ni foydalanuvchi tilida yozadi |
