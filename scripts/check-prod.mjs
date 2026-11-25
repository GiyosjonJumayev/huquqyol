// Ishga tushirishdan oldingi tekshiruv: node scripts/check-prod.mjs
// XATO — shu holatda ochmang; OGOHLANTIRISH — ishlaydi, lekin funksiya o‘chiq. Maxfiy qiymatlar chop etilmaydi.
import { readFileSync } from "node:fs";
try { for (const l of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)){ const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(l); if (m && process.env[m[1]] === undefined && m[2]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); } } catch {}
const E = process.env, bad = [], warn = [], ok = [];
const has = k => !!(E[k] || "").trim();
const must = (c, good, msg) => (c ? ok.push(good) : bad.push(msg)), want = (c, good, msg) => (c ? ok.push(good) : warn.push(msg));

must(E.NODE_ENV === "production", "NODE_ENV=production", "NODE_ENV=production qo‘ying");
must(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(E.PUBLIC_HOST || ""), "PUBLIC_HOST", "PUBLIC_HOST — domen (https:// siz), masalan huquqyol.uz: havolalar va to‘lovdan qaytish shu domenga bo‘ladi");
must(/^(1|true)$/i.test(E.FORCE_HTTPS || ""), "HTTPS majburiy", "FORCE_HTTPS=1");
must(has("TRUST_PROXY"), "TRUST_PROXY", "TRUST_PROXY=1 (Caddy/Nginx ortida) — aks holda barcha foydalanuvchilar bitta IP");
must(has("DATABASE_URL"), "Baza manzili", "DATABASE_URL");
must((E.APP_SECRET || "").length >= 32, "APP_SECRET", "APP_SECRET — kamida 32 belgi: node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"");
must(!/^(huquqyol|postgres|password|parol|123)/i.test(decodeURIComponent(/:\/\/[^:]+:([^@]+)@/.exec(E.DATABASE_URL || "")?.[1] || "")), "Baza paroli", "Baza paroli juda oddiy — tasodifiy parol qo‘ying");
must(E.REQUIRE_ADMIN_2FA !== "0", "Admin uchun 2FA", "REQUIRE_ADMIN_2FA=0 — production’da o‘chirmang");
const pm = has("PAYME_MERCHANT_ID") && has("PAYME_KEY"), ck = has("CLICK_SERVICE_ID") && has("CLICK_MERCHANT_ID") && has("CLICK_SECRET_KEY");
must(pm === (has("PAYME_MERCHANT_ID") || has("PAYME_KEY")), "Payme kalitlari butun", "PAYME_MERCHANT_ID va PAYME_KEY ikkalasi ham kerak");
must(ck === (has("CLICK_SERVICE_ID") || has("CLICK_MERCHANT_ID") || has("CLICK_SECRET_KEY")), "Click kalitlari butun", "CLICK_SERVICE_ID, CLICK_MERCHANT_ID va CLICK_SECRET_KEY uchalasi ham kerak");
want(pm, "Payme ulangan", "Payme ulanmagan"); want(ck, "Click ulangan", "Click ulanmagan");
want(!(pm && E.PAYME_TEST === "1"), "Payme ishchi rejimda", "PAYME_TEST=1 — sinov rejimi, haqiqiy pul kelmaydi");
want(!ck || has("CLICK_MERCHANT_USER_ID"), "Click qaytarish", "CLICK_MERCHANT_USER_ID yo‘q — Click to‘lovini paneldan qaytarib bo‘lmaydi");
want(has("COMPANY_NAME") && /^\d{9}$/.test(E.COMPANY_INN || ""), "Rekvizitlar", "COMPANY_NAME / COMPANY_INN — oferta va hisob-fakturada ko‘rinadi (to‘lov tizimlari talab qiladi)");
want(has("COMPANY_ACCOUNT") && has("COMPANY_MFO"), "Bank o‘tkazmasi", "COMPANY_ACCOUNT / COMPANY_MFO yo‘q — bank o‘tkazmasi ko‘rinmaydi");
want(!pm || (has("FISCAL_IKPU") && has("FISCAL_PACKAGE_CODE")), "Fiskal chek kodlari", "FISCAL_IKPU / FISCAL_PACKAGE_CODE yo‘q — Payme chekiga mahsulot kodi qo‘shilmaydi");
want(has("SMTP_URL"), "Xat yuborish", "SMTP_URL yo‘q — parolni tiklash va e-pochtani tasdiqlash ishlamaydi");
want(E.SHOW_DEMO !== "1", "Namuna yuristlar yashirin", "SHOW_DEMO=1 — katalogda namuna (soxta) profillar ko‘rinadi");
want(E.TZ === "Asia/Tashkent" || !has("TZ"), "Vaqt mintaqasi", "TZ=Asia/Tashkent bo‘lsin");

if (has("DATABASE_URL")){
  const { initDb, migrate, one, closeDb } = await import("../server/db.js");
  try {
    initDb(); await migrate();
    const a = await one("select count(*) filter (where role = 'admin')::int admins, count(*) filter (where role = 'admin' and totp_enabled_at is null)::int no2fa from users");
    ok.push("Bazaga ulanish va migratsiyalar");
    want(a.admins > 0, `Adminlar: ${a.admins}`, "Admin yo‘q: saytda ro‘yxatdan o‘tib, node scripts/make-admin.mjs <e-pochta>");
    want(a.no2fa === 0, "Adminlarda 2FA", `${a.no2fa} ta adminda 2FA yoqilmagan (birinchi kirishda so‘raladi)`);
  } catch (e){ bad.push("Bazaga ulanib bo‘lmadi: " + e.message.replace(/\/\/[^@]*@/, "//***@")); }
  await closeDb();
}
for (const x of ok) console.log("  ✓ " + x);
for (const x of warn) console.log("  ! OGOHLANTIRISH: " + x);
for (const x of bad) console.log("  ✗ XATO: " + x);
console.log(bad.length ? `\n${bad.length} ta xato — tuzating.` : "\nIshga tushirish mumkin.");
process.exit(bad.length ? 1 : 0);
