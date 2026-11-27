// Hisob xavfsizligi: e-pochtani tasdiqlash, parolni tiklash, ikki bosqichli kirish, qurilmalar, ma’lumotlarni yuklab olish va hisobni o‘chirish.
import { randomBytes, createHash } from "node:crypto";
import { q, one, tx } from "./db.js";
import { clean, ValidationError } from "./validate.js";
import { msg } from "./i18n.js";
import { hashPassword, verifyPassword, tokenId, checkPassword, createSession, adminEmails } from "./auth.js";
import { sendMail, mailEnabled, siteUrl } from "./mail.js";
import { audit } from "./billing.js";
import { newSecret, checkCode, otpauth, newRecovery, hashRecovery, seal, unseal } from "./totp.js";

const err = (key, status = 400, vars) => Object.assign(new ValidationError(key, vars), { status });
const sha = s => createHash("sha256").update(s).digest("hex");
const TOKEN = /^[A-Za-z0-9_-]{30,80}$/;

// ---------- Bir martalik havolalar (bazada faqat xesh) ----------
export async function issueToken(kind, { userId = null, hours, data = null }){
  const t = randomBytes(32).toString("base64url");
  if (userId && kind !== "invite") await q("delete from user_tokens where user_id = $1 and kind = $2", [userId, kind]);
  await q("insert into user_tokens(id, kind, user_id, data, expires_at) values ($1, $2, $3, $4, now() + make_interval(hours => $5))", [sha(t), kind, userId, data ? JSON.stringify(data) : null, hours]);
  return t;
}
export const peekToken = (kind, t) => TOKEN.test(String(t || "")) ? one("select * from user_tokens where id = $1 and kind = $2 and expires_at > now()", [sha(t), kind]) : null;
export const takeToken = async (run, kind, t) => TOKEN.test(String(t || "")) ? (await run("delete from user_tokens where id = $1 and kind = $2 and expires_at > now() returning *", [sha(t), kind])).rows[0] || null : null;

// ---------- E-pochtani tasdiqlash ----------
export async function sendVerify(req, user){
  const base = siteUrl(req);
  if (!mailEnabled() || !base) return false;
  const t = await issueToken("verify", { userId: user.id, hours: 24 });
  return sendMail(user.email, "verify", { lang: req.lang, link: `${base}/tasdiqlash?t=${t}` });
}
export async function resendVerify(req, res){
  if (req.user.email_verified_at) return res.json({ ok: true });
  if (!await sendVerify(req, req.user)) throw err("mailOff", 503);
  res.json({ ok: true });
}
export async function confirmEmail(req, res){
  const ok = await tx(async run => {
    const r = await takeToken(run, "verify", req.body?.token);
    if (!r) return false;
    const u = (await run("update users set email_verified_at = coalesce(email_verified_at, now()) where id = $1 returning id, email, role", [r.user_id])).rows[0];
    // Admin roli faqat e-pochta egaligi tasdiqlangandan keyin
    if (u && adminEmails().has(u.email.toLowerCase()) && u.role !== "admin"){ await run("update users set role = 'admin' where id = $1", [u.id]); await audit(run, { userId: u.id, action: "role.admin", target: `user:${u.id}`, data: { by: "ADMIN_EMAILS" }, ip: req.ip }); }
    return true;
  });
  if (!ok) throw err("badLink", 400);
  res.json({ ok: true, next: req.user ? "/xavfsizlik" : "/kirish" });
}

// ---------- Parolni tiklash: javob har doim bir xil (e-pochta borligini bilib bo‘lmaydi) ----------
export async function forgot(req, res){
  if (!mailEnabled() || !siteUrl(req)) throw err("mailOff", 503);
  const email = clean(req.body?.email, 254).toLowerCase();
  res.json({ ok: true });
  try {
    const u = await one("select id, email from users where lower(email) = $1", [email]);
    if (!u) return;
    const t = await issueToken("reset", { userId: u.id, hours: 1 });
    await sendMail(u.email, "reset", { lang: req.lang, link: `${siteUrl(req)}/parol-tiklash?t=${t}` });
  } catch (e){ console.error("[forgot]", e.message); }
}
export async function resetPassword(req, res){
  const pw = checkPassword(req.body?.password), hash = await hashPassword(pw);
  await tx(async run => {
    const r = await takeToken(run, "reset", req.body?.token);
    if (!r) throw err("badLink");
    await run("update users set password_hash = $2, failed_logins = 0, locked_until = null, email_verified_at = coalesce(email_verified_at, now()) where id = $1", [r.user_id, hash]);
    await run("delete from sessions where user_id = $1", [r.user_id]);                    // barcha qurilmalardan chiqariladi
    await audit(run, { userId: r.user_id, action: "password.reset", ip: req.ip });
  });
  res.json({ ok: true, next: "/kirish" });
}

// ---------- Ikki bosqichli kirish ----------
async function needPassword(req){
  const u = await one("select password_hash, totp_secret, totp_enabled_at, totp_last from users where id = $1", [req.user.id]);
  if (!await verifyPassword(String(req.body?.password ?? "").slice(0, 200), u.password_hash)) throw err("badPassword", 400);
  return u;
}
export async function totpStart(req, res){
  const u = await needPassword(req);
  if (u.totp_enabled_at) throw err("badState", 409);
  const secret = newSecret();
  await q("update users set totp_secret = $2, totp_last = 0 where id = $1", [req.user.id, seal(secret)]);
  res.set("Cache-Control", "no-store").json({ ok: true, secret, uri: otpauth(secret, req.user.email) });
}
export async function totpEnable(req, res){
  const u = await one("select totp_secret, totp_enabled_at from users where id = $1", [req.user.id]);
  const secret = unseal(u?.totp_secret);
  if (!secret || u.totp_enabled_at) throw err("badState", 409);
  const step = checkCode(secret, req.body?.code);
  if (!step) throw err("badCode", 400);
  const codes = newRecovery();
  await q("update users set totp_enabled_at = now(), totp_last = $2, totp_recovery = $3 where id = $1", [req.user.id, step, codes.map(hashRecovery)]);
  await q("delete from sessions where user_id = $1 and id <> $2", [req.user.id, tokenId(req)]);
  await audit(q, { userId: req.user.id, action: "2fa.on", ip: req.ip });
  res.set("Cache-Control", "no-store").json({ ok: true, codes });
}
export async function totpDisable(req, res){
  const u = await needPassword(req);
  if (!u.totp_enabled_at) throw err("badState", 409);
  if (!await verifySecond(q, { ...u, id: req.user.id }, req.body?.code)) throw err("badCode");
  await q("update users set totp_secret = null, totp_enabled_at = null, totp_recovery = '{}' where id = $1", [req.user.id]);
  await audit(q, { userId: req.user.id, action: "2fa.off", ip: req.ip });
  res.json({ ok: true });
}
/** Ikkinchi bosqich: ilova kodi (bir marta) yoki zaxira kod (bir marta). Atomar — parallel takror o‘tmaydi. */
export async function verifySecond(run, u, code){
  const secret = unseal(u.totp_secret), step = secret && checkCode(secret, code, u.totp_last);
  if (step) return (await run("update users set totp_last = $2 where id = $1 and totp_last < $2", [u.id, step])).rowCount === 1;
  const h = hashRecovery(code);
  return String(code || "").replace(/[^0-9a-f]/gi, "").length === 10 && (await run("update users set totp_recovery = array_remove(totp_recovery, $2) where id = $1 and $2 = any(totp_recovery)", [u.id, h])).rowCount === 1;
}

// ---------- Qurilmalar ----------
export const sessionsOf = async req => {
  const cur = tokenId(req);
  return (await q("select id, created_at, ip, ua from sessions where user_id = $1 and expires_at > now() order by created_at desc limit 30", [req.user.id])).rows.map(s => ({ ref: s.id.slice(0, 16), current: s.id === cur, created_at: s.created_at, ip: s.ip, ua: s.ua }));
};
export async function endSession(req, res){
  const ref = String(req.params.ref);
  if (ref === "others") await q("delete from sessions where user_id = $1 and id <> $2", [req.user.id, tokenId(req)]);
  else if (/^[0-9a-f]{16}$/.test(ref)) await q("delete from sessions where user_id = $1 and left(id, 16) = $2", [req.user.id, ref]);
  else throw err("notFound", 404);
  res.json({ ok: true });
}

// ---------- Ma’lumotlarim ----------
export async function exportData(req, res){
  const id = req.user.id, rows = (sql, p = [id]) => q(sql, p).then(r => r.rows);
  const [user, profile, subs, pays, cons, cabinet, sessions] = await Promise.all([
    one("select id, email, name, phone, role, created_at, email_verified_at, last_login_at from users where id = $1", [id]),
    one("select kind, name, firm, license, license_issuer, region, district, address, hours, phone, email, telegram, website, areas, formats, langs, experience, price, headline, about, education, achievements, services, status, created_at from lawyer_profiles where user_id = $1", [id]),
    rows("select plan, status, price, started_at, ends_at from subscriptions where user_id = $1"), rows("select id, kind, amount, months, status, method, created_at, paid_at from payments where user_id = $1"),
    rows("select id, scenario, format, message, status, offer_price, created_at, case_data, case_at, case_withdrawn_at from consultations where citizen_id = $1"),
    one("select data, updated_at from cabinet_data where user_id = $1", [id]), rows("select created_at, ip, ua from sessions where user_id = $1")]);
  res.set({ "Cache-Control": "private, no-store", "Content-Disposition": 'attachment; filename="huquqyol-malumotlarim.json"' }).json({ exportedAt: new Date().toISOString(), user, profile, subscriptions: subs, payments: pays, consultations: cons, cabinet, sessions });
}
export async function deleteAccount(req, res){
  const u = await needPassword(req);
  if (u.totp_enabled_at && !await verifySecond(q, { ...u, id: req.user.id }, req.body?.code)) throw err("badCode");
  if (req.user.role === "admin") throw err("ownRole");
  await tx(async run => {
    // Moliyaviy yozuvlar buxgalteriya uchun shaxssiz qoladi (payments.user_id → null); qolgan hammasi o‘chadi
    if (req.user.org_role === "owner"){ await run("update users set org_id = null, org_role = null where org_id = $1 and id <> $2", [req.user.org_id, req.user.id]); await run("delete from org_cabinet where org_id = $1", [req.user.org_id]); }
    await run("delete from lawyer_profiles where user_id = $1", [req.user.id]);
    await run("delete from users where id = $1", [req.user.id]);
    await audit(run, { action: "account.deleted", target: `user:${req.user.id}` });
  });
  res.clearCookie("hy_sid", { path: "/" });
  res.json({ ok: true, next: "/" });
}
