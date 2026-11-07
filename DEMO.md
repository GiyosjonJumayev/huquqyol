# HuquqYo‘l — taqdimot ssenariysi (2–3 daqiqa)

## 0. Tayyorgarlik (30 soniya)
- `npm install && npm start` → http://localhost:3000. Internet yo‘q bo‘lsa ham ishlaydi, chunki shriftlar va bilim bazasi loyiha ichida.
- AI rejimini ko‘rsatish uchun `.env` ga `ANTHROPIC_API_KEY` yozing. Kalitsiz ham tahlil ishlaydi (qidiruv rejimi).
- Ikkita tab oching: `/?lang=uz` va `/?lang=ru`.

## 1. Muammo (20 soniya)
«Fuqaroning huquqi buzilganda u uch narsani bilmaydi: qaysi qonun himoya qiladi, qayerga borish kerak, muddat qachon tugaydi. Yurist xizmati qimmat, ariza yozish esa qo‘rqinchli.»

## 2. Jonli namoyish (90 soniya)
1. **O‘z so‘zi bilan yozadi.** Namuna tugmasini bosing: «Ish beruvchim 3 oydan beri maosh bermayapti, qarzi 9 million so‘m» → **Reja tuzish**.
2. **Reja.** Quyidagilarni ko‘rsating:
   - muddat kartasi: necha kun qolgan, oxirgi kun, xavf darajasi;
   - kalkulyator: MK 333-modda bo‘yicha kompensatsiya;
   - 3 qadam: ish beruvchi → inspeksiya → sud;
   - normalar va lex.uz havolalari;
   - dalillar ro‘yxati.
   Belgilangan dalillar ariza ilovalariga tushadi. **Kalendarga eslatma** tugmasi muddatni telefon kalendariga qo‘shadi; **Rejani chop etish** — qog‘ozdagi reja.
3. **Ariza.** **Namuna bilan to‘ldirish** tugmasini bosing: hujjat ko‘z oldida to‘ladi. Shundan keyin:
   - «Kimga» bo‘limida ish beruvchi / inspeksiya / sud almashadi;
   - **PDF** yoki **Word** yuklab olinadi;
   - pastda «Qanday topshiriladi» bo‘limi va my.sud.uz havolasi turadi.
4. **Til.** Tepada **Рус** tugmasini bosing. Ariza shu joyning o‘zida ruscha «ТРЕБОВАНИЕ» bo‘lib qayta yasaladi, kiritilgan ma’lumotlar saqlanadi. **Ўзб** — o‘zbekcha kirill.
5. **Ruscha matn.** «Бывший муж не платит алименты на двоих детей» deb yozing. Tizim alimentni topadi va bolalar sonini 2 deb ajratadi. Kalkulyator 1/3 ulushni ko‘rsatadi.
6. **Noaniq vaziyat.** «Meni ishdan bo‘shatishdi va oxirgi oylikni bermadi» deb yozing: tizim hisob-kitobni tanlaydi va «Noqonuniy bo‘shatish» variantini ham taklif qiladi — bir bosishda almashtiriladi. Mikrofon tugmasi orqali ovoz bilan ham aytish mumkin.
7. **Boshqa sohalar.** Jarima: chegirma sanalari, 10 kunlik shikoyat muddati. Qarz: 3 yillik da’vo muddati.

## 3. Nega bu ishonchli (20 soniya)
- **Normalar qo‘lda tekshirilgan.** 39 ta norma; AI bazada yo‘q modda raqamini qo‘sha olmaydi, chunki bunday raqamlar javobdan avtomatik olib tashlanadi.
- **Muddat qonun bo‘yicha hisoblanadi.** MK 9-modda: oy oxiri, yakshanba kuni keyingi ish kuniga ko‘chiriladi.
- **Maxfiylik.** Ma’lumot faqat qurilmada saqlanadi, matn logga yozilmaydi.
- **Sifat.**
  - 43 unit/API va 6 brauzer testi;
  - Lighthouse: Accessibility, Best Practices, SEO 100, Performance 99–100;
  - axe: 0 xato (yorug‘ va qorong‘i mavzuda).

## Hakamlar savollari
| Savol | Javob |
|---|---|
| AI xato qilsa-chi? | AI faqat tasniflaydi va faktlarni ajratadi. Muddat, summa va ariza matni tekshirilgan shablon va formulalardan chiqadi. AI ishlamasa, qidiruv rejimi avtomatik yoqiladi. |
| Qonun o‘zgarsa? | Baza `scripts/build-kb.py` va `kb_ru.py` da turadi. Normani o‘zgartirib `npm run kb` buyrug‘ini bersangiz, generator ikki tilning mosligini tekshiradi. |
| Yangi soha qo‘shish? | `scen(...)` bilan holat, maydonlar va hujjat shablonini yozasiz. UI, kalkulyator joyi va DOCX/PDF avtomatik ishlaydi. |
| Rus tilida ariza berish mumkinmi? | Murojaatlar to‘g‘risidagi qonun murojaatni davlat tilida yoki boshqa tilda berishga ruxsat beradi. Sudda ish o‘zbek tilida yuritiladi, zarur bo‘lsa tarjimon ta’minlanadi. Ilova bu haqda ogohlantiradi. |
| Biznes model? | Fuqarolar uchun bepul. Pullik yo‘nalishlar: yuridik klinikalar va advokatlar uchun B2B (murojaatni yuristga yo‘naltirish), HR bo‘limlari uchun mehnat qonuni tekshiruvi, davlat xizmatlariga integratsiya. |
| Kengaytirish? | my.gov.uz va my.sud.uz orqali elektron topshirish, OCR yordamida qaror/chekni o‘qish, ovozli kiritish. |
