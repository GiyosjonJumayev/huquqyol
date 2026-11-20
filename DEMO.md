# HuquqYo‘l — hakaton taqdimoti

Bu fayl sahnaga chiqishdan oldin o‘qiladi. Uch qism: **pitch (3 daqiqa)**, **jonli namoyish (4–5 daqiqa)**, **hakamlar savollari**. Oxirida zaxira reja va nazorat ro‘yxati.

---

## Sahnadan 30 daqiqa oldin — nazorat ro‘yxati

- [ ] `npm ci && npm start` → http://localhost:3000 ochiladi. Internetsiz ham ishlaydi: shriftlar, bilim bazasi va hujjat generatori loyiha ichida.
- [ ] `npm test` (61 test) va `npm run test:e2e` (10 brauzer testi) yashil.
- [ ] AI rejimi kerak bo‘lsa, `.env` da `ANTHROPIC_API_KEY`; `/api/health` → `"ai":true`. Kalit bo‘lmasa ham hammasi ishlaydi (qidiruv + qoidalar rejimi) — buni ataylab ko‘rsatish mumkin.
- [ ] Brauzer: **Edge** (o‘zbekcha tabiiy ovoz bor — ovozli o‘qishni shunda ko‘rsating). Masshtab 110–125%, qorong‘i mavzu o‘chiq.
- [ ] Oldindan ochilgan tablar: `/?lang=uz`, `/?lang=ru`, `/statistika`.
- [ ] Ma’lumotlarni tozalang: footer → «Ma’lumotlarimni o‘chirish» (eski holat chiqib qolmasin).
- [ ] Telefon (ixtiyoriy): xuddi shu manzil telefonda ochiq — «telefonda ham ishlaydi» deyish uchun.
- [ ] Statistika sahifasi taqdimotdan oldin bo‘sh bo‘lishi mumkin — bu to‘g‘ri, sanoqlar haqiqiy. Namoyish davomida ochilgan holatlar u yerda paydo bo‘ladi.

---

## 1. Pitch — 3 daqiqa

**Muammo (40 soniya).**
«Fuqaroning huquqi buzilganda u uch narsani bilmaydi: *qaysi qonun himoya qiladi*, *qayerga borish kerak* va *muddat qachon tugaydi*. Maosh berilmasa, kartadan pul yechilsa, uy egasi depozitni qaytarmasa — odam yo kutib qoladi, yo muddatni o‘tkazib yuboradi. Yurist xizmati qimmat, ariza yozish esa qo‘rqinchli. Eng ko‘p zarar ko‘radiganlar — keksalar, qishloq aholisi va xorijdagi mehnat migrantlari.»

**Yechim (60 soniya).**
«HuquqYo‘l — huquqiy yo‘l xaritasi. Fuqaro muammosini o‘z so‘zi bilan, o‘zbekcha yoki ruscha, hatto ovoz bilan aytadi. Tizim bir daqiqada:
1. vaziyatni aniqlaydi va **qonun moddasini lex.uz havolasi bilan** ko‘rsatadi;
2. **qancha kun qolganini** qonun bo‘yicha hisoblaydi va qadamma-qadam reja beradi;
3. **qayerga borishni** — idoraning rasmiy manzili va telefoni bilan — va **qaysi dalillarni yig‘ishni** aytadi;
4. **tayyor arizani** Word yoki PDF qilib beradi — ish beruvchiga, inspeksiyaga yoki sudga.»

**Nega ishonchli (40 soniya).**
«Qonun matnini AI o‘ylab topmaydi. 62 ta norma va 14 ta idoraning aloqa ma’lumoti rasmiy manbalardan qo‘lda tekshirilgan, har birida manba bor. AI faqat vaziyatni tasniflaydi; muddat, summa va ariza matni tekshirilgan formula va shablonlardan chiqadi. AI ishlamasa ham ilova to‘liq ishlaydi.»

**Kimlar uchun va natija (40 soniya).**
«12 soha, 24 hayotiy holat: mehnat, iste’molchi, aliment, ijara, kommunal, bank va mikroqarz, yo‘l-transport, pensiya, migrantlar va boshqalar. Uch tilda. Keksalar uchun katta shrift va ovozli o‘qish. Anonim statistika qaysi muammolar eng ko‘p uchrashini ko‘rsatadi — bu davlat organlari va yuridik klinikalar uchun ham qimmatli ma’lumot, lekin hech kimning matni saqlanmaydi.»

---

## 2. Jonli namoyish — 4–5 daqiqa

Har bir qadamda **bitta narsani** ayting. Tugmani bosishdan oldin nima bo‘lishini aytib qo‘ying.

1. **O‘z so‘zi bilan (40 s).** Namuna: «Ish beruvchim 3 oydan beri maosh bermayapti, qarzi 9 million so‘m» → **Reja tuzish**.
   - Muddat kartasi: necha kun qoldi, oxirgi kun (yakshanba bo‘lsa — dushanbaga ko‘chiriladi, MK 9-modda).
   - Kalkulyator: MK 333-modda bo‘yicha kechiktirish kompensatsiyasi — summa matndan avtomatik olindi.
2. **Qayerga borish va dalillar (40 s).** Qadam ostidagi «Manzil va aloqa ↓» → Davlat mehnat inspeksiyasi kartasi: manzil, ishonch telefoni (bosilsa qo‘ng‘iroq), manba va tekshirilgan sana. Pastda dalillar: «MUHIM» belgilari va har biri qayerdan olinishi.
3. **Ariza (50 s).** **Ariza tayyorlash** → **Namuna bilan to‘ldirish** — hujjat ko‘z oldida to‘ladi. «Kimga»: ish beruvchi → inspeksiya → sud — matn o‘zgaradi. **PDF** yuklab oling va oching.
4. **Til (20 s).** **Рус** — o‘sha ariza ruscha rasmiy uslubda («ТРЕБОВАНИЕ», «Требую:»), kiritilgan ma’lumotlar saqlanadi. **Ўзб** — kirill.
5. **Yangi soha (40 s).** Bosh sahifa → «Kartamdan bilmagan holda 2 million so‘m yechib olishdi». Qadamlar: kartani bloklash → politsiya (102) → Markaziy bank (71) 200-00-44 → sud. Yoki migrant: «Rossiyada ishlayapman, ish beruvchi pasportimni olib qo‘ydi» → Migratsiya agentligining Moskva, Seul, Istanbul raqamlari.
6. **Keksalar uchun (40 s).** **Aa Qulaylik** → «Eng katta» shrift — butun sayt kattalashadi. **Tinglash** — reja ovozda o‘qiladi, o‘qilayotgan qadam belgilanadi. Esc — to‘xtatish.
7. **Statistika (20 s).** `/statistika`: namoyish davomida ochilgan holatlar shu yerda — sohalar bo‘yicha. «Matn, IP, cookie saqlanmaydi — faqat sanoq.»
8. **Yakun (10 s).** «Bir daqiqada: qonun, muddat, qayerga borish, dalillar va tayyor ariza. Bepul, uch tilda, internetsiz ham.»

---

## 3. Zaxira reja

| Nima bo‘lsa | Nima qilish |
|---|---|
| Internet yo‘q | Hech narsa o‘zgarmaydi: tahlil qidiruv rejimida, shriftlar va baza lokal. qidiruv maydoni ostidagi «Qonunlar bazasi bo‘yicha tahlil» yozuvini ko‘rsatib, «AI ishlamasa ham ishlaydi» deb ayting. |
| AI kaliti ishlamadi | Xuddi shunday — avtomatik qidiruv rejimi. |
| Ovoz chiqmadi | Zaldagi kompyuterda o‘zbekcha ovoz yo‘q bo‘lishi mumkin: ilova rus ovoziga o‘tadi va xabar beradi. Edge’da ko‘rsating yoki shu qadamni o‘tkazib yuboring. |
| Proyektor past aniqlikda | **Aa → Katta** shrift. |
| «So‘rovlar juda ko‘p» xabari | Bir daqiqada juda ko‘p so‘rov — himoya ishladi. 1 daqiqa kuting yoki boshqa tabda davom eting. |
| Noutbuk ishlamay qoldi | Telefonda yoki zaxira noutbukda `npm start`; yoki joylashtirilgan sayt (DEPLOY.md). Skrinshotlar — `docs/screenshots/`. |

---

## 4. Hakamlar savollari

| Savol | Javob |
|---|---|
| AI noto‘g‘ri modda aytsa-chi? | AI faqat holatni tasniflaydi va faktlarni ajratadi. Bazada yo‘q norma javobdan avtomatik olib tashlanadi. Muddat, summa va ariza matni — tekshirilgan formula va shablonlar. AI ishlamasa, qidiruv rejimi avtomatik yoqiladi. |
| Normalar qanchalik ishonchli? | 62 ta norma lex.uz’dagi asl matn bo‘yicha tekshirilgan, 55 tasida modda raqami bor. Raqami tasdiqlanmaganlari «faqat qonun» belgisi bilan chiqadi — taxmin yozilmaydi. Manbalar README’da. |
| Idoralar manzili eskirsa? | Har bir karta rasmiy sahifadan olingan va unda manba havolasi hamda tekshirilgan sana bor. Yangilash — `scripts/kb_offices.py` va `npm run kb`; test manbalar faqat rasmiy domenlarda ekanini tekshiradi. |
| Maxfiylik? | Ariza ma’lumotlari faqat qurilmada (localStorage). Serverga faqat hujjat yasash uchun yuboriladi va saqlanmaydi, matn logga yozilmaydi. Statistika faqat sanoq: matn, IP, cookie yo‘q; takroriy sanashning oldini olish izi faqat xotirada va kunlik o‘chiriladi. Batafsil — SECURITY.md. |
| Xavfsizlik? | Qat’iy CSP (inline skript va stil yo‘q), boshqa saytdan so‘rov rad etiladi (Origin + Fetch Metadata), rate limit, kiruvchi ma’lumot holat spetsifikatsiyasi bo‘yicha tekshiriladi, AI’ga prompt-in’ektsiyadan himoya. `npm audit`: 0 zaiflik. |
| Qulaylik (a11y)? | WCAG 2.2 AA: axe — 0 xato (yorug‘ va qorong‘i, telefon, katta shrift). 4 darajali shrift, ovozli o‘qish, 44 px teginish maydoni, klaviatura bilan to‘liq boshqaruv. |
| Qonun o‘zgarsa? | Baza kodda emas, generatorda: `scripts/build-kb.py` va `kb_ru.py`. Normani o‘zgartirib `npm run kb` — generator ikki tilning mosligini, shablon kalitlarini va dalillar sonini tekshiradi. |
| Yangi soha qo‘shish qancha vaqt? | Bitta holat — normalar, qadamlar, maydonlar va hujjat shabloni — bir necha soat. UI, kalkulyator joyi, DOCX/PDF, kirill va «qayerga borish» avtomatik ishlaydi. Oxirgi versiyalarda 6 ta yangi soha (12 holat) aynan shu yo‘l bilan qo‘shildi. |
| Rus tilida ariza berish mumkinmi? | Murojaatlar to‘g‘risidagi qonun murojaatni davlat tilida yoki boshqa tilda berishga ruxsat beradi. Sudda ish o‘zbek tilida yuritiladi, zarur bo‘lsa tarjimon ta’minlanadi. |
| Bu yuristni almashtiradimi? | Yo‘q. Bu birinchi qadam: fuqaro huquqini va muddatini biladi, tayyor hujjat bilan boradi. Murakkab ishda yuristga murojaat qilish tavsiya etiladi — ilova buni har sahifada aytadi. |
| Biznes model / barqarorlik? | Fuqarolar uchun bepul. Yo‘nalishlar: yuridik klinikalar va advokatlar uchun B2B (murojaatni yuristga yo‘naltirish), HR bo‘limlari uchun mehnat qonuni tekshiruvi, davlat organlari uchun anonim statistika (qaysi muammolar ko‘p), my.gov.uz / my.sud.uz bilan integratsiya. Server xarajati past: AI ixtiyoriy, qolgani oddiy Node.js. |
| Masshtab? | Bitta Node.js jarayoni; holat yo‘q (stateless), shuning uchun gorizontal kengayadi. Statistika — kichik JSON fayl; kerak bo‘lsa ma’lumotlar bazasiga o‘tkaziladi. |
| Keyingi qadamlar? | Yo‘l xaritasi README’da: my.sud.uz’ga to‘g‘ridan-to‘g‘ri topshirish, chek/qaror rasmini o‘qish (OCR), Telegram bot, qoraqalpoq tili, yuridik klinikalar bilan hamkorlik. |

---

## 5. Raqamlar (slaydlar va savollar uchun)

| | |
|---|---|
| Sohalar / holatlar | 12 / 24 |
| Normalar (modda raqami bilan) | 60 (53) |
| Qonun va kodekslar | 14 |
| Hujjat shablonlari | 53 (uch tilda — 159) |
| Dalillar (qayerdan olinishi bilan) | 120 |
| Idoralar (rasmiy manba bilan) | 14 |
| Kalkulyatorlar | 5 — MK 333 kompensatsiya, iste’molchi penyasi, aliment, jarima chegirmasi, mikroqarz chegarasi |
| Tillar | o‘zbek (lotin, kirill), rus |
| Testlar | 61 unit/API + 10 brauzer (axe bilan) |

Lighthouse ballarini ko‘rsatmoqchi bo‘lsangiz, sahnadan oldin o‘zingiz o‘lchang: Chrome yoki Edge → DevTools → **Lighthouse** → Mobile va Desktop. Natijani slaydga faqat o‘lchangan qiymat bilan yozing.
