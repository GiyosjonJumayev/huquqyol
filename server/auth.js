// Ro‘yxatdan o‘tish, kirish, sessiyalar. Parol: scrypt (tuz bilan), taqqoslash vaqtga bog‘liq emas.
// Sessiya: tasodifiy token HttpOnly cookie da, bazada faqat uning SHA-256 xeshi (baza sizsa ham sessiya o‘g‘irlanmaydi).
// Brute-force: 5 ta xato urinishdan keyin hisob 15 daqiqa bloklanadi; IP bo‘yicha rate limit (index.js).
import { scrypt as _scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { q, one, tx, dbEnabled } from "./db.js";
import { clean, ValidationError } from "./validate.js";
import { msg } from "./i18n.js";

const scrypt = promisify(_scrypt);
const N = 16384, KEYLEN = 64;
import { HOME } from "./access.js";           // kirgandan keyin har bir rol o‘z «uyi»ga
export async function hashPassword(pw){
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, KEYLEN, { N, r: 8, p: 1 });
  return `scrypt$${N}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}
export async function verifyPassword(pw, stored){
  const [alg, n, salt, hash] = String(stored || "").split("$");
  if (alg !== "scrypt" || !salt || !hash) { await scrypt(pw, "x", KEYLEN, { N, r: 8, p: 1 }); return false; }
  const key = await scrypt(pw, Buffer.from(salt, "base64url"), KEYLEN, { N: Number(n), r: 8, p: 1 });
  const ref = Buffer.from(hash, "base64url");
  return ref.length === key.length && timingSafeEqual(ref, key);
}
// Mavjud bo‘lmagan foydalanuvchi uchun ham bir xil vaqt sarflansin (email borligini taxmin qilib bo‘lmasin)
const DUMMY = hashPassword("dummy-password-1");

export const COOKIE = "hy_sid";
const TTL_DAYS = Number(process.env.SESSION_DAYS || 30);
const sha = s => createHash("sha256").update(s).digest("hex");
export const adminEmails = () => new Set((process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean));

// ---------- Tekshiruv ----------
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
export function vRegister(b){
  const email = clean(b?.email, 254).toLowerCase(), name = clean(b?.name, 120), phone = clean(b?.phone, 40), pw = String(b?.password ?? "");
  if (name.length < 2) throw new ValidationError("required", { label: "F.I.Sh." });
  if (!EMAIL.test(email)) throw new ValidationError("email");
  if (phone && !/^[+\d\s()-]{7,40}$/.test(phone)) throw new ValidationError("phone");
  if (pw.length < 8 || pw.length > 200 || !/\p{L}/u.test(pw) || !/\d/.test(pw)) throw new ValidationError("weakPassword");
  const role = ["citizen", "lawyer", "org"].includes(b?.role) ? b.role : "citizen";
  const org = role === "org" ? { name: clean(b?.orgName, 200), kind: ["korxona", "muassasa", "firma", "byuro", "boshqa"].includes(b?.orgKind) ? b.orgKind : "korxona", inn: clean(b?.inn, 20) } : null;
  if (org && org.name.length < 2) throw new ValidationError("required", { label: "Tashkilot nomi" });
  if (org?.inn && !/^\d{9}$/.test(org.inn)) throw new ValidationError("inn");
  if (b?.consent !== true) throw new ValidationError("terms");
  return { email, name, phone, password: pw, role, org };
}

// ---------- Sessiya ----------
export async function createSession(res, req, userId){
  const token = randomBytes(32).toString("base64url");
  await q("insert into sessions(id, user_id, expires_at, ip, ua) values ($1, $2, now() + make_interval(days => $3), $4, $5)",
    [sha(token), userId, TTL_DAYS, req.ip || null, String(req.get("user-agent") || "").slice(0, 200)]);
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: req.secure, path: "/", maxAge: TTL_DAYS * 864e5 });
}
export const checkPassword = v => {
  const pw = String(v ?? "");
  if (pw.length < 8 || pw.length > 200 || !/\p{L}/u.test(pw) || !/\d/.test(pw)) throw new ValidationError("weakPassword");
  return pw;
};
// Admin roli ADMIN_EMAILS bo‘yicha: production’da faqat e-pochta egaligi tasdiqlangan bo‘lsa (aks holda birovning manzili bilan
// birinchi ro‘yxatdan o‘tgan odam admin bo‘lib qolardi). SMTP yo‘q serverda: node scripts/make-admin.mjs <e-pochta>
const autoAdmin = (email, verified) => adminEmails().has(email) && (process.env.NODE_ENV !== "production" || !!verified);
export const tokenId = req => { const t = tokenOf(req); return t ? sha(t) : null; };
const tokenOf = req => new RegExp(`(?:^|;\\s*)${COOKIE}=([A-Za-z0-9_-]{20,80})(?:;|$)`).exec(req.headers.cookie || "")?.[1];

// Har bir so‘rovda: cookie bo‘lsa — foydalanuvchi (req.user). Baza o‘chiq bo‘lsa — hech narsa qilmaydi.
export async function attachUser(req, res, next){
  req.user = null;
  const t = tokenOf(req);
  if (!t || !dbEnabled() || /\.[a-z0-9]{1,5}$/i.test(req.path)) return next();      // statik fayllar uchun bazaga so‘rov yo‘q
  try {
    req.user = await one(`select u.id, u.email, u.name, u.phone, u.role, u.org_id, u.org_role, u.email_verified_at, (u.totp_enabled_at is not null) as totp, o.name as org_name
      from sessions s join users u on u.id = s.user_id left join organizations o on o.id = u.org_id
      where s.id = $1 and s.expires_at > now()`, [sha(t)]);
    if (req.user){ req.user.id = Number(req.user.id); req.user.org_id = req.user.org_id == null ? null : Number(req.user.org_id); }
  } catch (e){ console.error("[auth]", e.message); }
  next();
}
export const requireUser = (req, res, next) => req.user ? next() : res.status(401).json({ error: "auth", key: "auth" });
export const requireRole = (...roles) => (req, res, next) => !req.user ? res.status(401).json({ error: "auth", key: "auth" })
  : roles.includes(req.user.role) ? next() : res.status(403).json({ error: "forbidden", key: "forbidden" });

// ---------- Amallar ----------
export async function register(req, res){
  const v = vRegister(req.body);
  const hash = await hashPassword(v.password);
  const role = autoAdmin(v.email, false) ? "admin" : v.role;
  const user = await tx(async run => {
    const exists = (await run("select 1 from users where lower(email) = $1", [v.email])).rowCount;
    if (exists) throw new ValidationError("emailTaken");
    const u = (await run("insert into users(email, phone, name, password_hash, role) values ($1,$2,$3,$4,$5) returning id, role",
      [v.email, v.phone || null, v.name, hash, role])).rows[0];
    if (v.org){
      const o = (await run("insert into organizations(name, kind, inn, created_by) values ($1,$2,$3,$4) returning id", [v.org.name, v.org.kind, v.org.inn || null, u.id])).rows[0];
      await run("update users set org_id = $1, org_role = 'owner' where id = $2", [o.id, u.id]);
    }
    // Yurist va tashkilot: 14 kunlik bepul sinov obunasi
    if (v.role === "lawyer" || v.role === "org"){
      const plan = v.role === "org" ? "org" : "pro";
      await run("insert into subscriptions(user_id, org_id, plan, status, price, ends_at) values ($1, (select org_id from users where id = $1), $2, 'trial', 0, now() + interval '14 days')", [u.id, plan]);
    }
    return u;
  }).catch(e => { throw e.code === "23505" ? new ValidationError("emailTaken") : e; });
  await createSession(res, req, user.id);
  import("./account.js").then(m => m.sendVerify(req, { id: user.id, email: v.email })).catch(e => console.error("[verify]", e.message));
  res.status(201).json({ ok: true, role: user.role, next: HOME[user.role] || "/hisob" });
}

export async function login(req, res){
  const email = clean(req.body?.email, 254).toLowerCase(), pw = String(req.body?.password ?? "").slice(0, 200);
  const u = await one("select id, role, password_hash, failed_logins, locked_until, email_verified_at, totp_secret, totp_enabled_at, totp_last from users where lower(email) = $1", [email]);
  if (u?.locked_until && new Date(u.locked_until) > new Date()) throw new ValidationError("locked");
  const ok = u ? await verifyPassword(pw, u.password_hash) : (await DUMMY, await verifyPassword(pw, await DUMMY), false);
  if (!u || !ok){
    if (u) await q(`update users set failed_logins = failed_logins + 1,
      locked_until = case when failed_logins + 1 >= 5 then now() + interval '15 minutes' else locked_until end where id = $1`, [u.id]);
    throw Object.assign(new ValidationError("badLogin"), { status: 401 });
  }
  // Ikkinchi bosqich: ilova kodi yoki zaxira kod. Xato kod ham urinish sifatida sanaladi (bloklash umumiy).
  if (u.totp_enabled_at){
    const code = String(req.body?.code ?? "").trim();
    if (!code) return res.status(401).json({ error: msg(req.lang, "needCode"), need: "code" });
    const { verifySecond } = await import("./account.js");
    if (!await verifySecond(q, u, code)){
      await q(`update users set failed_logins = failed_logins + 1, locked_until = case when failed_logins + 1 >= 5 then now() + interval '15 minutes' else locked_until end where id = $1`, [u.id]);
      return res.status(401).json({ error: msg(req.lang, "badCode"), need: "code" });
    }
  }
  const role = autoAdmin(email, u.email_verified_at) && u.role !== "admin" ? "admin" : u.role;
  await q("update users set failed_logins = 0, locked_until = null, last_login_at = now(), role = $2 where id = $1", [u.id, role]);
  await createSession(res, req, u.id);
  res.json({ ok: true, role, next: HOME[role] || "/hisob" });
}

export async function logout(req, res){
  const t = tokenOf(req);
  if (t && dbEnabled()) await q("delete from sessions where id = $1", [sha(t)]);
  res.clearCookie(COOKIE, { path: "/" });
  res.json({ ok: true, next: "/" });
}

export async function changePassword(req, res){
  const cur = String(req.body?.current ?? "").slice(0, 200), pw = checkPassword(req.body?.password);
  const u = await one("select password_hash from users where id = $1", [req.user.id]);
  if (!(await verifyPassword(cur, u.password_hash))) throw Object.assign(new ValidationError("badLogin"), { status: 401 });
  await q("update users set password_hash = $2 where id = $1", [req.user.id, await hashPassword(pw)]);
  // Boshqa qurilmalardagi sessiyalar bekor qilinadi (joriysi qoladi)
  await q("delete from sessions where user_id = $1 and id <> $2", [req.user.id, sha(tokenOf(req))]);
  res.json({ ok: true });
}
