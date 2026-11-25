// Rol berish (SMTP bo‘lmagan serverda yoki birinchi admin uchun): node scripts/make-admin.mjs email@domen.uz [admin|moderator|lawyer|citizen]
// Foydalanuvchi avval saytda ro‘yxatdan o‘tgan bo‘lishi kerak.
import { readFileSync } from "node:fs";
try { for (const l of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)){ const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(l); if (m && process.env[m[1]] === undefined && m[2]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); } } catch {}
const [email, role = "admin"] = process.argv.slice(2);
if (!/^[^\s@]+@[^\s@]+$/.test(email || "") || !["admin", "moderator", "lawyer", "citizen"].includes(role)){ console.error("Ishlatish: node scripts/make-admin.mjs email@domen.uz [admin|moderator|lawyer|citizen]"); process.exit(1); }
const { initDb, migrate, q, closeDb } = await import("../server/db.js");
if (!initDb()){ console.error("DATABASE_URL berilmagan"); process.exit(1); }
await migrate();
const r = await q("update users set role = $2, email_verified_at = coalesce(email_verified_at, now()) where lower(email) = lower($1) returning id", [email, role]);
if (r.rowCount) await q("insert into audit_log(user_id, action, target, data) values ($1, 'role.cli', $2, $3)", [r.rows[0].id, `user:${r.rows[0].id}`, JSON.stringify({ role })]);
console.log(r.rowCount ? `Tayyor: rol — ${role}` : "Bunday hisob topilmadi. Avval saytda ro‘yxatdan o‘ting.");
await closeDb();
process.exit(r.rowCount ? 0 : 1);
