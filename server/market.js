// Biznes va kelishuv modeli:
//  • Obunalar: Yurist Pro, Firma (oylik narx), Tashkilot (narx kelishuv bo‘yicha — admin belgilaydi). Ro‘yxatdan o‘tganda 14 kun sinov.
//    To‘lov tizimi ulanmaguncha: obuna → «kutilmoqda» hisob-faktura, admin to‘lovni tasdiqlaydi → obuna 30 kunga faol.
//  • Kelishuv (konsultatsiya): fuqaro so‘rov yuboradi → yurist narx taklif qiladi → fuqaro rozi bo‘ladi (kelishuv) →
//    yurist bajarilganini belgilaydi. Platforma komissiyasi (COMMISSION_PCT, standart 10%) yuristdan undiriladi.
//  • Katalog: admin tasdiqlagan yuristlar (litsenziya tekshirilgan) namuna profillar bilan birga chiqadi.
import { q, one, tx, dbEnabled } from "./db.js";
import { clean, ValidationError } from "./validate.js";
import { areaList } from "./business.js";
import { COURTS, kbFor } from "./kb.js";

export const PRICES = { pro: 149000, firma: 490000, org: 0 };
export const COMMISSION_PCT = Number(process.env.COMMISSION_PCT || 10);
const int = (v, max = 1e10) => { const n = Math.round(Number(String(v ?? "").replace(/[^\d]/g, ""))); return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0; };
const err = (key, status = 400) => Object.assign(new ValidationError(key), { status });

// ---------- Yuristlar (bazadan) ----------
const pair = v => [v || "", v || ""];
const asCatalog = r => {
  const services = Array.isArray(r.services) && r.services.length ? r.services
    : [{ name: ["Konsultatsiya", "Консультация"], min: 30, format: r.formats[0] || "online", price: Number(r.price) }];
  return {
    id: `y${r.id}`, dbId: Number(r.id), demo: false, kind: r.kind, plan: "pro",
    name: r.name, firm: r.firm || "", headline: pair(r.headline), about: pair(r.about), education: r.education || "", achievements: r.achievements || "",
    region: r.region || "", district: r.district || "", address: pair(r.address || r.district), hours: pair(r.hours),
    experience: r.experience, langs: r.langs.length ? r.langs : ["uz"], areas: r.areas, formats: r.formats.length ? r.formats : ["online"],
    services, photo: r.photo_at ? `/yuristlar/rasm/${r.id}?v=${new Date(r.photo_at).getTime()}` : null,
    contacts: { phone: r.phone, email: r.email || "", telegram: r.telegram || "", website: r.website || "" },
    license: { verified: false, number: r.license || "", issuer: r.license_issuer || "" }, userId: r.user_id ? Number(r.user_id) : null
  };
};
// Katalogda: admin tasdiqlagan (litsenziya tekshirilgan) VA Yurist Pro / Firma to‘lovi faol (sinov emas) profillar
export const VISIBLE_SQL = `p.status = 'approved' and exists(select 1 from subscriptions s where s.user_id = p.user_id
  and s.plan in ('pro','firma') and s.status = 'active' and (s.ends_at is null or s.ends_at > now()))`;
export async function approvedLawyers(){
  if (!dbEnabled()) return [];
  try {
    const rows = (await q(`select p.id, p.user_id, p.kind, p.name, p.firm, p.headline, p.about, p.education, p.achievements, p.region, p.district, p.address, p.hours,
        p.experience, p.langs, p.areas, p.formats, p.services, p.price, p.photo_at, p.phone, p.email, p.telegram, p.website, p.license, p.license_issuer
        from lawyer_profiles p where ${VISIBLE_SQL} order by p.id`)).rows;
    return rows.map(asCatalog);
  } catch (e){ console.error("[market]", e.message); return []; }
}
export function recordView(ref, domain){
  if (!dbEnabled()) return;
  q("insert into lawyer_events(lawyer_ref, kind, domain) values ($1, 'view', $2)", [ref, domain || null]).catch(() => {});
}

// Katalogga ariza: tizimga kirgan yurist uchun profil bog‘lanadi (bitta foydalanuvchi — bitta profil)
export async function applyToDb(app, user){
  if (user){
    const ex = await one("select id from lawyer_profiles where user_id = $1", [user.id]);
    if (ex){
      await q(`update lawyer_profiles set status = 'pending', kind=$2, name=$3, firm=$4, license=$5, region=$6, district=$7, phone=$8, email=$9,
        areas=$10, formats=$11, langs=$12, experience=$13, price=$14, headline=$15, about=$16, reviewed_at = null where id = $1`,
        [ex.id, app.kind, app.name, app.firm, app.license, app.region, app.district, app.phone, app.email, app.areas, app.formats, app.langs, app.experience, app.price, app.headline, app.about]);
      return ex.id;
    }
  }
  return (await one(`insert into lawyer_profiles(user_id, kind, name, firm, license, region, district, phone, email, areas, formats, langs, experience, price, headline, about)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning id`,
    [user?.id || null, app.kind, app.name, app.firm, app.license, app.region, app.district, app.phone, app.email, app.areas, app.formats, app.langs, app.experience, app.price, app.headline, app.about])).id;
}

// ---------- Obunalar ----------
export async function subscribe(req, res){
  const plan = ["pro", "firma", "org"].includes(req.body?.plan) ? req.body.plan : null;
  if (!plan) throw err("option");
  if (req.user.role === "citizen") await q("update users set role = $2 where id = $1", [req.user.id, plan === "org" ? "org" : "lawyer"]);
  const open = await one(`select id from subscriptions where user_id = $1 and plan = $2
    and (status = 'pending' or (status = 'active' and (ends_at is null or ends_at > now() + interval '5 days')))`, [req.user.id, plan]);
  if (open) return res.json({ ok: true, id: Number(open.id), next: "/hisob" });     // to‘lovi kutilayotgan yoki hali faol obuna — takror yaratilmaydi
  const r = await tx(async run => {
    const s = (await run("insert into subscriptions(user_id, org_id, plan, status, price) values ($1,$2,$3,'pending',$4) returning id",
      [req.user.id, req.user.org_id || null, plan, PRICES[plan]])).rows[0];
    await run("insert into payments(user_id, subscription_id, kind, amount, status, note) values ($1,$2,'subscription',$3,'pending',$4)",
      [req.user.id, s.id, PRICES[plan], plan === "org" ? "Narx kelishuv bo‘yicha belgilanadi" : "Hisob-faktura: 1 oy"]);
    return s;
  });
  res.status(201).json({ ok: true, id: Number(r.id), next: "/hisob" });
}
export async function mySubscriptions(userId){
  return (await q("select * from subscriptions where user_id = $1 order by created_at desc", [userId])).rows;
}

// ---------- Kelishuvlar (konsultatsiyalar) ----------
export async function requestConsultation(req, res){
  const lawyerId = int(req.body?.lawyer, 1e12), message = clean(req.body?.message, 1500);
  if (message.length < 10) throw err("message");
  const p = await one("select id, user_id from lawyer_profiles where id = $1 and status = 'approved'", [lawyerId]);
  if (!p) throw err("lawyerNotFound", 404);
  if (p.user_id && Number(p.user_id) === req.user.id) throw err("ownProfile");
  const kb = kbFor("uz"), sc = typeof req.body?.scenario === "string" && kb.SCENARIO_BY_ID[req.body.scenario];
  const format = req.body?.format === "office" ? "office" : "online";
  const c = await one(`insert into consultations(lawyer_id, citizen_id, scenario, domain, format, message, commission_pct) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [p.id, req.user.id, sc?.id || null, sc?.domain || null, format, message, COMMISSION_PCT]);
  await q("insert into lawyer_events(lawyer_ref, kind, domain, scenario) values ($1, 'request', $2, $3)", [`y${p.id}`, sc?.domain || null, sc?.id || null]);
  res.status(201).json({ ok: true, id: Number(c.id), next: "/hisob" });
}
// Holatlar oqimi: kim, qaysi holatdan, qaysi holatga o‘tkaza oladi
const FLOW = {
  offer:    { who: "lawyer",  from: ["requested", "offered"], to: "offered" },
  decline:  { who: "lawyer",  from: ["requested", "offered"], to: "declined" },
  agree:    { who: "citizen", from: ["offered"], to: "agreed" },
  cancel:   { who: "citizen", from: ["requested", "offered"], to: "cancelled" },
  complete: { who: "lawyer",  from: ["agreed"], to: "completed" }
};
export async function actConsultation(req, res){
  const act = req.params.act, f = FLOW[act];
  if (!f) throw err("option", 404);
  const id = int(req.params.id, 1e12);
  await tx(async run => {
    const c = (await run(`select c.*, p.user_id as lawyer_user from consultations c join lawyer_profiles p on p.id = c.lawyer_id where c.id = $1 for update`, [id])).rows[0];
    if (!c) throw err("notFound", 404);
    const mine = f.who === "lawyer" ? Number(c.lawyer_user) === req.user.id : Number(c.citizen_id) === req.user.id;
    if (!mine) throw err("forbidden", 403);
    if (!f.from.includes(c.status)) throw err("badState", 409);
    if (act === "offer"){
      const price = int(req.body?.price, 1e10);
      await run("update consultations set status = 'offered', offer_price = $2, offer_note = $3, offer_at = now(), updated_at = now() where id = $1", [id, price, clean(req.body?.note, 500)]);
    } else {
      await run("update consultations set status = $2, updated_at = now() where id = $1", [id, f.to]);
      // Kelishuv tuzildi — platforma komissiyasi (yuristdan) hisob-faktura sifatida
      if (act === "agree" && Number(c.offer_price) > 0)
        await run("insert into payments(user_id, consultation_id, kind, amount, status, note) values ($1,$2,'commission',$3,'pending',$4)",
          [c.lawyer_user, id, Math.round(Number(c.offer_price) * Number(c.commission_pct) / 100), `Komissiya ${c.commission_pct}%`]);
      if (act === "cancel" || act === "decline") await run("update payments set status = 'cancelled' where consultation_id = $1 and status = 'pending'", [id]);
    }
  });
  res.json({ ok: true });
}
export async function consultationsFor(user){
  const lawyer = await one("select id, status from lawyer_profiles where user_id = $1", [user.id]);
  const asCitizen = (await q(`select c.*, p.name as lawyer_name, p.phone as lawyer_phone, p.email as lawyer_email from consultations c
    join lawyer_profiles p on p.id = c.lawyer_id where c.citizen_id = $1 order by c.created_at desc limit 100`, [user.id])).rows;
  const asLawyer = lawyer ? (await q(`select c.*, u.name as citizen_name, u.phone as citizen_phone, u.email as citizen_email from consultations c
    join users u on u.id = c.citizen_id where c.lawyer_id = $1 order by c.created_at desc limit 200`, [lawyer.id])).rows : [];
  return { lawyer, asCitizen, asLawyer };
}

// ---------- Admin ----------
export async function adminAct(req, res){
  const { kind, act } = req.params, id = int(req.params.id, 1e12);
  if (kind === "lawyer" && ["approve", "reject"].includes(act)){
    const r = await q(`update lawyer_profiles set status = $2, reviewed_at = now(), reviewed_by = $3, review_note = $4 where id = $1`,
      [id, act === "approve" ? "approved" : "rejected", req.user.id, clean(req.body?.note, 300)]);
    if (r.rowCount && act === "approve") await q("update users set role = 'lawyer' where id = (select user_id from lawyer_profiles where id = $1) and role = 'citizen'", [id]);
    if (!r.rowCount) throw err("notFound", 404);
  }
  else if (kind === "photo" && ["approve", "remove"].includes(act)){
    // Rasm moderatsiyasi: tasdiqlash yoki o‘chirish (yurist keyin yangisini yuklashi mumkin)
    const r = act === "approve"
      ? await q("update lawyer_profiles set photo_reviewed_at = now() where id = $1 and photo is not null", [id])
      : await q("update lawyer_profiles set photo = null, photo_type = null, photo_at = null, photo_reviewed_at = now() where id = $1", [id]);
    if (!r.rowCount) throw err("notFound", 404);
  }
  else if (kind === "payment" && act === "confirm"){
    await tx(async run => {
      const p = (await run("select * from payments where id = $1 for update", [id])).rows[0];
      if (!p) throw err("notFound", 404);
      if (p.status !== "pending") throw err("badState", 409);
      const amount = p.kind === "subscription" && req.body?.amount != null ? int(req.body.amount) : Number(p.amount);
      await run("update payments set status = 'paid', amount = $2, paid_at = now(), method = $3 where id = $1", [id, amount, clean(req.body?.method, 40) || "manual"]);
      if (p.subscription_id) await run(`update subscriptions set status = 'active', price = greatest(price, $2), started_at = now(), ends_at = now() + interval '30 days' where id = $1`, [p.subscription_id, amount]);
    });
  }
  else if (kind === "payment" && act === "cancel"){
    const r = await q("update payments set status = 'cancelled' where id = $1 and status = 'pending'", [id]);
    if (!r.rowCount) throw err("badState", 409);
  }
  else if (kind === "subscription" && act === "cancel"){
    await q("update subscriptions set status = 'cancelled', ends_at = now() where id = $1", [id]);
  }
  else if (kind === "user" && act === "role"){
    const role = ["citizen", "lawyer", "org", "moderator", "admin"].includes(req.body?.role) ? req.body.role : null;
    if (!role) throw err("option");
    if (id === req.user.id && role !== "admin") throw err("ownRole");
    await q("update users set role = $2 where id = $1", [id, role]);
  }
  else throw err("option", 404);
  res.json({ ok: true });
}

// Rasm moderatsiyasi navbati: yangi yoki o‘zgargan, hali tekshirilmagan rasmlar
export async function photoQueue(){
  return (await q(`select id, name, kind, status, photo_at from lawyer_profiles
    where photo is not null and (photo_reviewed_at is null or photo_at > photo_reviewed_at) order by photo_at limit 100`)).rows;
}

// Admin paneli uchun tahlil: foydalanuvchilar, obunalar, daromad, yuristlar, kelishuvlar
export async function adminStats(){
  const [roles, newUsers, subs, orgSubs, revenue, mrr, cons, consDomain, lawyers, pending, pendingPay, recentUsers, trialEnding] = await Promise.all([
    q("select role, count(*)::int n from users group by role"),
    q(`select to_char(date_trunc('month', created_at), 'YYYY-MM') m, count(*)::int n from users where created_at > now() - interval '12 months' group by 1 order by 1`),
    q("select plan, status, count(*)::int n, coalesce(sum(price),0)::bigint sum from subscriptions group by plan, status order by plan, status"),
    q(`select s.id, s.plan, s.status, s.price, s.ends_at, s.created_at, u.name, u.email, o.name org_name, o.kind org_kind, o.inn
       from subscriptions s join users u on u.id = s.user_id left join organizations o on o.id = coalesce(s.org_id, u.org_id)
       where s.plan in ('firma','org') or o.id is not null order by s.created_at desc limit 100`),
    q(`select to_char(date_trunc('month', paid_at), 'YYYY-MM') m, kind, sum(amount)::bigint sum, count(*)::int n from payments
       where status = 'paid' and paid_at > now() - interval '12 months' group by 1, 2 order by 1`),
    q("select coalesce(sum(price),0)::bigint mrr, count(*)::int n from subscriptions where status = 'active' and (ends_at is null or ends_at > now())"),
    q("select status, count(*)::int n, coalesce(sum(offer_price),0)::bigint value from consultations group by status"),
    q("select coalesce(domain,'—') domain, count(*)::int n from consultations group by 1 order by 2 desc"),
    q(`select l.lawyer_ref, sum((l.kind='view')::int)::int views, sum((l.kind='request')::int)::int requests from lawyer_events l group by 1`),
    q("select * from lawyer_profiles where status = 'pending' order by created_at"),
    q(`select p.*, u.name, u.email from payments p left join users u on u.id = p.user_id where p.status = 'pending' order by p.created_at`),
    q("select id, name, email, role, created_at, last_login_at from users order by created_at desc limit 50"),
    q(`select s.id, s.plan, s.ends_at, u.name, u.email from subscriptions s join users u on u.id = s.user_id
       where s.status = 'trial' and s.ends_at between now() and now() + interval '7 days' order by s.ends_at`)
  ]);
  const byLawyer = (await q(`select p.id, p.name, p.status, count(c.id)::int total,
      sum((c.status in ('agreed','completed'))::int)::int agreed, sum((c.status = 'completed')::int)::int completed,
      coalesce(sum(case when c.status in ('agreed','completed') then c.offer_price end),0)::bigint value,
      coalesce(sum(case when c.status in ('agreed','completed') then round(c.offer_price * c.commission_pct / 100) end),0)::bigint commission
      from lawyer_profiles p left join consultations c on c.lawyer_id = p.id group by p.id order by total desc, p.id limit 100`)).rows;
  return { roles: roles.rows, newUsers: newUsers.rows, subs: subs.rows, orgSubs: orgSubs.rows, revenue: revenue.rows, mrr: mrr.rows[0],
    cons: cons.rows, consDomain: consDomain.rows, events: lawyers.rows, byLawyer, pending: pending.rows, pendingPay: pendingPay.rows,
    recentUsers: recentUsers.rows, trialEnding: trialEnding.rows };
}
export const regionsList = () => COURTS.regions.map(r => r.name);
export const areaIds = () => new Set(areaList("uz").map(a => a.id));
