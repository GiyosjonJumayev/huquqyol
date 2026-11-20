# Xavfsizlik va maxfiylik

## Qanday ma’lumot qayerda turadi

| Ma’lumot | Qayerda | Serverda saqlanadimi |
|---|---|---|
| Vaziyat matni (tahlil uchun) | Brauzer → `/api/analyze` | Yo‘q. Javobdan keyin unutiladi, logga yozilmaydi. AI yoqilgan bo‘lsa, matn tahlil uchun Anthropic API’ga yuboriladi. |
| Hujjat rasmi yoki PDF | Brauzer → `/api/photo` | Yo‘q. Brauzerda 1600 px gacha kichraytiriladi, faqat so‘rov davomida xotirada turadi, logga yozilmaydi; PDF fayl serverga yuborilmaydi: brauzerda pdf.js bilan ochilib, faqat matni yoki sahifa rasmlari yuboriladi. Serverning o‘zida bepul OCR (Tesseract) bilan o‘qiladi; AI kaliti bo‘lsa — Anthropic API’ga yuboriladi. |
| Ariza maydonlari (F.I.Sh., manzil, telefon…) | Faqat qurilmaning `localStorage` ida | Yo‘q. Hujjat yasash uchun yuboriladi va darhol unutiladi. Footer’dagi «Ma’lumotlarimni o‘chirish» hammasini o‘chiradi. |
| Til, shrift, mavzu va rasm paneli tanlovi | Cookie `hy_lang`, `hy_fs`, `hy_theme`, `hy_photo` | Yo‘q (faqat sahifani to‘g‘ri chizish uchun o‘qiladi). |
| Anonim statistika | `data/stats.json` | Faqat sanoqlar: holat nomi, kun, son. Matn, IP, cookie, brauzer ma’lumoti yo‘q. Takroriy sanashning oldini olish izi (HMAC, kunlik tasodifiy kalit) faqat xotirada va har kuni o‘chiriladi. `STATS=0` — o‘chirish. |

## Himoya choralari

- **CSP**: `script-src 'self'`, `script-src-attr 'none'`, `style-src-attr 'none'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`; HTTPS’da `upgrade-insecure-requests` va HSTS.
- **Boshqa saytdan so‘rovlar rad etiladi**: Origin tekshiruvi va Fetch Metadata (`Sec-Fetch-Site`); POST faqat `application/json`.
- **Rate limit**: umumiy API va har bir endpoint uchun alohida; proxy ortida `TRUST_PROXY=1`.
- **Kiruvchi ma’lumot**: har bir holat maydonlari spetsifikatsiya bo‘yicha tekshiriladi (tur, uzunlik, variant, sana); noma’lum maydonlar tashlanadi; boshqaruv va yo‘nalish belgilari tozalanadi; JSON 32 KB gacha (faqat `/api/photo` — 8 MB: rasm 3,5 MB gacha, 3 sahifagacha, jami 6 MB, PDF matni 20 000 belgigacha; fayl turi birinchi baytlardan tekshiriladi, alohida rate limit).
- **AI**: foydalanuvchi matni teglar ichida beriladi va undagi ko‘rsatmalar bajarilmaydi; AI javobidagi holat va normalar bazaga qarshi tekshiriladi, bazada yo‘q norma olib tashlanadi. Rasmdagi matn ham faqat ma’lumot sifatida o‘qiladi; AI o‘qigan sana (kelajakdagisi tashlanadi), summa va maydonlar qayta tekshiriladi.
- **Host sarlavhasi**: `FORCE_HTTPS` yo‘naltirishi faqat to‘g‘ri xost nomiga (`PUBLIC_HOST`).
- **Bog‘liqliklar**: versiyalar qat’iy qotirilgan; CI’da `npm audit --audit-level=high`.

## Zaiflik haqida xabar berish

Xavfsizlik muammosini topsangiz, ochiq issue yozmang — repozitoriy egasiga GitHub orqali shaxsiy xabar yuboring. Imkon qadar qisqa tavsif va qayta yaratish qadamlarini ilova qiling.
