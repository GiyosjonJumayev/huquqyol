// Yurist profili va Yurist Pro: profilni to‘ldirish (rasm, tajriba, ta’lim, xizmatlar va narxlar, aloqa),
// Pro holati, kabinet ma’lumotlarini hisobda saqlash, yurist statistikasi.
// Katalogda ko‘rinish: profil admin tomonidan tasdiqlangan (litsenziya) VA Yurist Pro (yoki Firma) to‘lovi faol.
// 14 kunlik sinov Pro vositalarini (kabinet, statistika) ochadi, lekin katalogga chiqarmaydi.
import { q, one } from "./db.js";
import { clean, ValidationError } from "./validate.js";
import { areaList } from "./business.js";
import { COURTS } from "./kb.js";

const err = (key, status = 400, vars) => Object.assign(new ValidationError(key, vars), { status });
const int = (v, min, max) => { const n = Math.round(Number(String(v ?? "").replace(/[^\d]/g, ""))); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min; };

// ---------- Pro holati ----------
export async function proStatus(userId){
  const s = await one(`select plan, status, ends_at from subscriptions where user_id = $1 and plan in ('pro','firma','org')
      and status in ('active','trial') and (ends_at is null or ends_at > now())
      order by (status = 'active') desc, ends_at desc nulls first limit 1`, [userId]);
  return { paid: s?.status === "active", trial: s?.status === "trial", tools: !!s, plan: s?.plan || null, endsAt: s?.ends_at || null };
}
export const requirePro = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "auth", key: "auth" });
  try { req.pro = await proStatus(req.user.id); } catch (e){ return next(e); }
  return req.pro.tools || req.user.role === "admin" ? next() : next(err("needPro", 402));
};

// ---------- Profil ----------
const FIELDS = "id, user_id, status, kind, name, firm, license, license_issuer, region, district, address, hours, phone, email, telegram, website, areas, formats, langs, experience, price, headline, about, education, achievements, services, photo_at, review_note, reviewed_at, created_at, updated_at";
export const myProfile = userId => one(`select ${FIELDS} from lawyer_profiles where user_id = $1`, [userId]);

const KINDS = ["advokat", "yurist", "firma", "mediator"];
export function vProfile(b){
  const s = (k, max) => clean(b?.[k], max);
  const name = s("name", 120), phone = s("phone", 40), email = s("email", 120).toLowerCase();
  if (name.length < 2) throw err("required", 400, { label: "F.I.Sh." });
  if (!/^[+\d\s()-]{7,40}$/.test(phone)) throw err("phone");
  if (email && !/^[^\s@]{1,64}@[^\s@]{1,100}\.[a-z]{2,}$/i.test(email)) throw err("email");
  const telegram = s("telegram", 40).replace(/^https?:\/\/t\.me\//i, "").replace(/^@/, "");
  if (telegram && !/^[A-Za-z0-9_]{5,32}$/.test(telegram)) throw err("telegram");
  const website = s("website", 200);
  if (website && !/^https:\/\/[^\s"'<>]{3,190}$/i.test(website)) throw err("website");
  const ids = new Set(areaList("uz").map(a => a.id));
  const arr = (k, ok, max) => Array.isArray(b?.[k]) ? [...new Set(b[k].filter(ok))].slice(0, max) : [];
  const services = (Array.isArray(b?.services) ? b.services : []).slice(0, 8).map(x => ({
    name: clean(x?.name, 120), min: int(x?.min, 0, 600), format: x?.format === "office" ? "office" : "online", price: int(x?.price, 0, 1e10), from: x?.from === true
  })).filter(x => x.name.length >= 2);
  return {
    kind: KINDS.includes(b?.kind) ? b.kind : "yurist", name, firm: s("firm", 160), license: s("license", 60), license_issuer: s("licenseIssuer", 160),
    region: COURTS.regions.some(r => r.name === b?.region) ? b.region : "", district: s("district", 80), address: s("address", 200), hours: s("hours", 120),
    phone, email, telegram, website,
    areas: arr("areas", a => ids.has(a), 10), formats: arr("formats", f => ["online", "office"].includes(f), 2), langs: arr("langs", l => ["uz", "ru", "en"].includes(l), 3),
    experience: int(b?.experience, 0, 70), price: services.length ? Math.min(...services.map(x => x.price)) : int(b?.price, 0, 1e10),
    headline: s("headline", 200), about: s("about", 3000), education: s("education", 1500), achievements: s("achievements", 1500), services
  };
}
// Ism, turi va litsenziya — moderator tekshiradigan maydonlar: o‘zgarsa profil qayta moderatsiyaga tushadi
export async function saveProfile(req, res){
  const v = vProfile(req.body), cur = await myProfile(req.user.id);
  const recheck = !cur || cur.status === "rejected" || cur.name !== v.name || cur.kind !== v.kind || (cur.license || "") !== v.license;
  const cols = ["kind", "name", "firm", "license", "license_issuer", "region", "district", "address", "hours", "phone", "email", "telegram", "website",
    "areas", "formats", "langs", "experience", "price", "headline", "about", "education", "achievements", "services"];
  const vals = cols.map(c => c === "services" ? JSON.stringify(v[c]) : v[c]);
  if (cur){
    await q(`update lawyer_profiles set ${cols.map((c, i) => `${c} = $${i + 2}`).join(", ")}, updated_at = now()
      ${recheck ? ", status = 'pending', reviewed_at = null, review_note = null" : ""} where id = $1`, [cur.id, ...vals]);
  } else {
    await q(`insert into lawyer_profiles(user_id, ${cols.join(", ")}) values ($1, ${cols.map((_, i) => `$${i + 2}`).join(", ")})`, [req.user.id, ...vals]);
  }
  if (req.user.role === "citizen") await q("update users set role = 'lawyer' where id = $1", [req.user.id]);
  res.json({ ok: true, status: recheck ? "pending" : cur.status, recheck });
}

// ---------- Rasm: faqat JPEG / PNG / WEBP, 512 KB gacha (brauzer 480 px ga kichraytirib yuboradi) ----------
const SIG = [["image/jpeg", b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF], ["image/png", b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))],
  ["image/webp", b => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP"]];
export async function savePhoto(req, res){
  const cur = await myProfile(req.user.id);
  if (!cur) throw err("profileFirst");
  if (req.body?.remove === true){ await q("update lawyer_profiles set photo = null, photo_type = null, photo_at = null where id = $1", [cur.id]); return res.json({ ok: true }); }
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.data || ""));
  if (!m) throw err("photoType");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length < 100 || buf.length > 512 * 1024) throw err("photoSize");
  const type = SIG.find(([, ok]) => ok(buf))?.[0];
  if (!type) throw err("photoType");
  await q("update lawyer_profiles set photo = $2, photo_type = $3, photo_at = now() where id = $1", [cur.id, buf, type]);
  res.json({ ok: true, url: `/yuristlar/rasm/${cur.id}?v=${Date.now()}` });
}
// Profil rasmi (yurist katalog uchun o‘zi yuklagan ommaviy rasm)
export async function sendPhoto(req, res, next){
  const id = int(req.params.id, 0, 1e12);
  const r = await one(`select p.photo, p.photo_type, p.photo_at, p.user_id, p.status from lawyer_profiles p where p.id = $1`, [id]);
  if (!r?.photo) return next();
  const etag = `"p${id}-${new Date(r.photo_at).getTime()}"`;
  res.set({ "Cache-Control": "public, max-age=86400", ETag: etag, "Content-Type": r.photo_type, "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" });
  if (req.get("If-None-Match") === etag) return res.status(304).end();
  res.send(r.photo);
}

// ---------- Kabinet ma’lumotlari (mijozlar, ishlar, muddatlar, blanka, shablonlar, tashkilot hujjatlari) ----------
export async function getCabinet(req, res){
  const r = await one("select data, updated_at from cabinet_data where user_id = $1", [req.user.id]);
  res.set("Cache-Control", "private, no-store").json({ data: r?.data || null, updatedAt: r?.updated_at || null });
}
export async function putCabinet(req, res){
  const d = req.body?.data;
  if (!d || typeof d !== "object" || Array.isArray(d) || d.v !== 1) throw err("badJson");
  const json = JSON.stringify(d);
  if (json.length > 900_000) throw err("tooLarge", 413);
  const r = await one(`insert into cabinet_data(user_id, data) values ($1, $2::jsonb)
    on conflict (user_id) do update set data = excluded.data, updated_at = now() returning updated_at`, [req.user.id, json]);
  res.json({ ok: true, updatedAt: r.updated_at });
}

// ---------- Yurist statistikasi va tahlil ----------
export async function lawyerStats(profileId){
  const ref = `y${profileId}`;
  const [views, viewsDaily, cons, byMonth, byDomain, recent] = await Promise.all([
    one(`select count(*)::int total, count(*) filter (where created_at > now() - interval '30 days')::int d30,
         count(*) filter (where created_at > now() - interval '7 days')::int d7 from lawyer_events where lawyer_ref = $1 and kind = 'view'`, [ref]),
    q(`select to_char(d, 'YYYY-MM-DD') as day, coalesce(n, 0)::int as n from generate_series(current_date - 29, current_date, interval '1 day') d
       left join (select date_trunc('day', created_at) dd, count(*) n from lawyer_events where lawyer_ref = $1 and kind = 'view'
         and created_at > now() - interval '31 days' group by 1) e on e.dd = d order by d`, [ref]),
    one(`select count(*)::int total, count(*) filter (where status = 'requested')::int requested, count(*) filter (where status = 'offered')::int offered,
         count(*) filter (where status in ('agreed','completed'))::int agreed, count(*) filter (where status = 'completed')::int completed,
         count(*) filter (where status in ('declined','cancelled'))::int lost,
         coalesce(sum(offer_price) filter (where status in ('agreed','completed')), 0)::bigint value,
         coalesce(round(avg(offer_price) filter (where status in ('agreed','completed'))), 0)::bigint avg_price,
         coalesce(sum(round(offer_price * commission_pct / 100)) filter (where status in ('agreed','completed')), 0)::bigint commission
         from consultations where lawyer_id = $1`, [profileId]),
    q(`select to_char(date_trunc('month', created_at), 'YYYY-MM') m, count(*)::int requests,
         count(*) filter (where status in ('agreed','completed'))::int agreed,
         coalesce(sum(offer_price) filter (where status in ('agreed','completed')), 0)::bigint value
       from consultations where lawyer_id = $1 and created_at > now() - interval '12 months' group by 1 order by 1`, [profileId]),
    q(`select coalesce(domain, '—') domain, count(*)::int n from consultations where lawyer_id = $1 group by 1 order by 2 desc`, [profileId]),
    q(`select c.id, c.status, c.created_at, c.offer_price, c.scenario, u.name from consultations c join users u on u.id = c.citizen_id
       where c.lawyer_id = $1 order by c.created_at desc limit 8`, [profileId])
  ]);
  return { views, viewsDaily: viewsDaily.rows, cons, byMonth: byMonth.rows, byDomain: byDomain.rows, recent: recent.rows };
}
