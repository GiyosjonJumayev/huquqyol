# To‘lovlarni ulash (Payme, Click, bank o‘tkazmasi)

Kod tayyor. Haqiqiy pul qabul qilish uchun **sizdan** kerak: yuridik shaxs yoki YaTT, bank hisobi, domen (HTTPS) va to‘lov tizimlari bilan shartnoma. Kalitlarni faqat serverdagi `.env` ga yozing — chatga, GitHub’ga yoki xatga yubormang.

## 1. Payme (Merchant API)

1. [business.payme.uz](https://business.payme.uz) da ro‘yxatdan o‘ting, shartnoma tuzing va **veb-kassa** oching.
2. Kassa sozlamalari:
   - **Endpoint URL:** `https://DOMEN/api/pay/payme`
   - **Account (rekvizit):** bitta maydon — `order_id` (son), hisob turi — **bir martalik**.
3. `.env`: `PAYME_MERCHANT_ID` (kassa ID), `PAYME_KEY` (kalit).
4. **Sinov:** `PAYME_KEY` ga `TEST_KEY` ni, `PAYME_TEST=1` ni qo‘ying; saytda obuna buyurtma qiling va [test.paycom.uz](https://test.paycom.uz) dagi ikkala ssenariyni o‘tkazing (bu ssenariylar `test/payments.test.js` da ham avtomatik tekshiriladi).
5. **Ishga tushirish:** haqiqiy kalitni qo‘ying, `PAYME_TEST` ni olib tashlang, qayta ishga tushiring va kichik summa bilan bitta haqiqiy to‘lov qilib ko‘ring.

Qaytarish Payme Business kabinetidan qilinadi — sayt holatni o‘zi yangilaydi va obuna muddatini ayiradi.

## 2. Click (SHOP API)

1. [click.uz](https://click.uz) da hamkor sifatida shartnoma; sizga `service_id`, `merchant_id`, `merchant_user_id`, `secret_key` beriladi.
2. Click kabinetida (yoki menejer orqali):
   - **Prepare URL:** `https://DOMEN/api/pay/click/prepare`
   - **Complete URL:** `https://DOMEN/api/pay/click/complete`
3. `.env`: `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_MERCHANT_USER_ID`, `CLICK_SECRET_KEY`.
4. Click’ning test dasturi bilan tekshiring, so‘ng kichik haqiqiy to‘lov.

Qaytarish: admin panel → Daromad → «Qaytarish» (Click qoidasi: faqat joriy oy to‘lovlari). Fiskalizatsiya (IKPU) Click kabinetida sozlanadi.

## 3. Bank o‘tkazmasi

`COMPANY_*` maydonlari to‘ldirilsa, to‘lov sahifasida hisob-faktura (PDF) paydo bo‘ladi. Pul tushgach: admin → Daromad → «Bank orqali tushdi».

## 4. Fiskal chek (Payme)

Xizmatingizning **IKPU** va **qadoq kodi**ni [tasnif.soliq.uz](https://tasnif.soliq.uz) dan toping (buxgalteringiz bilan), `.env`: `FISCAL_IKPU`, `FISCAL_PACKAGE_CODE`, `FISCAL_VAT` (0 yoki 12). Chek havolasi to‘lovdan keyin buyurtma sahifasida ko‘rinadi.

## 5. Narxlar

`PRICE_PRO`, `PRICE_FIRMA`, `PRICE_BIZNES`, `BIZNES_SEATS`, `COMMISSION_PCT`, `FIRMA_SEATS`, `ORG_SEATS`, `PLAN_DISCOUNT_3`, `PLAN_DISCOUNT_12` — `.env` dan, kodni o‘zgartirmasdan. Tashkilot narxi: admin → Daromad → «Narx belgilash» → mijoz o‘sha sahifada onlayn to‘laydi.

## Qanday himoyalangan

| Xavf | Himoya |
|---|---|
| Soxta «to‘landi» so‘rovi | Payme: Basic kalit; Click: MD5 imzo; taqqoslash doimiy vaqtda. Brauzerdan kelgan ma’lumotga ishonilmaydi. |
| Summani o‘zgartirish | Summa faqat bazadan; provayder yuborgan summa bilan aniq solishtiriladi. To‘lanayotgan buyurtma o‘zgarmaydi. |
| Ikki marta hisoblash | Buyurtma qatori qulflanadi; bazada «bitta ochiq» va «bitta to‘langan tranzaksiya» cheklovi; takror so‘rov — bir xil javob. |
| Birovning buyurtmasi | Har bir yo‘lda egasi tekshiriladi (404). |
| Karta o‘g‘irlanishi | Karta ma’lumoti serverimizga umuman kelmaydi. |
| Ichki suiiste’mol | Har bir pul amali jurnalda (admin → Jurnal); admin uchun 2FA majburiy. |
