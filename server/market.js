// Biznes va kelishuv modeli:
//  • Obunalar: Yurist Pro, Firma (oylik narx), Tashkilot (narx kelishuv bo‘yicha — admin belgilaydi). Ro‘yxatdan o‘tganda 14 kun sinov.
//    To‘lov tizimi ulanmaguncha: obuna → «kutilmoqda» hisob-faktura, admin to‘lovni tasdiqlaydi → obuna 30 kunga faol.
//  • Kelishuv (konsultatsiya): fuqaro so‘rov yuboradi → yurist narx taklif qiladi → fuqaro rozi bo‘ladi (kelishuv) →
//    yurist bajarilganini belgilaydi. Platforma komissiyasi (COMMISSION_PCT, standart 10%) yuristdan undiriladi.
//  • Katalog: admin tasdiqlagan yuristlar (litsenziya tekshirilgan) namuna profillar bilan birga chiqadi.
import { q, one, tx, dbEnabled } from "./db.js";
import { clean, ValidationError, vDocument, vForm } from "./validate.js";
import { stats } from "./stats.js";
import { areaList } from "./business.js";
import { COURTS, kbFor } from "./kb.js";
import { adminPractice } from "./practice.js";
import { adminPayment, audit } from "./billing.js";

export { PRICES } from "./billing.js";
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
    license: { verified: false, number: r.license || "", issuer: r.license_issuer || "" }, userId: r.user_id ? Number(r.user_id) : null, orgId: r.org_id ? Number(r.org_id) : null
  };
};
// Katalogda: admin tasdiqlagan (litsenziya tekshirilgan) VA Yurist Pro / Firma to‘lovi faol (sinov emas) profillar
export const VISIBLE_SQL = `p.status = 'approved' and exists(select 1 from subscriptions s where (s.user_id = p.user_id or (s.plan = 'firma' and s.org_id = (select org_id from users where id = p.user_id)))
  and s.plan in ('pro','firma') and s.status = 'active' and (s.ends_at is null or s.ends_at > now()))`;
export async function approvedLawyers(){
  if (!dbEnabled()) return [];
  try {
    const rows = (await q(`select p.id, p.user_id, (select org_id from users u where u.id = p.user_id) as org_id, p.kind, p.name, p.firm, p.headline, p.about, p.education, p.achievements, p.region, p.district, p.address, p.hours,
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

// ---------- Kelishuvlar (konsultatsiyalar) ----------
// Ish paketi: fuqaro roziligi bilan reja va ariza ma’lumotlari (holat, kimga, sana, ariza maydonlari, dalillar).
// Hujjat matni saqlanmaydi — yurist ochganda shu ma’lumotlardan serverdagi tekshirilgan shablon bilan qayta yasaladi.
// Ariza bilan bir xil tekshiruvdan o‘tadi (vDocument): noma’lum maydonlar tashlanadi, uzunlik va sana tekshiriladi.
export function vCase(body){
  if (body?.shareCase !== true || !body?.case || typeof body.case !== "object" || Array.isArray(body.case)) return null;
  const lang = ["uz", "cyr", "ru"].includes(body.case.lang) ? body.case.lang : "uz";
  const s = kbFor(lang === "ru" ? "ru" : "uz").SCENARIO_BY_ID[body.case.scenario];
  if (!s) throw err("scenario");
  // Har bir maydon alohida tekshiriladi: noto‘g‘ri yoki noma’lum maydon tashlanadi, qolganlari yuboriladi
  const form = {}, src = body.case.form && typeof body.case.form === "object" ? body.case.form : {};
  for (const [k, v] of Object.entries(src).slice(0, 80)) { try { Object.assign(form, vForm(s, { [k]: v }, lang)); } catch {} }
  let trigger = body.case.triggerDate;
  try { vDocument({ scenario: s.id, triggerDate: trigger, lang }); } catch { trigger = undefined; }
  const v = vDocument({ ...body.case, form, triggerDate: trigger, lang, letterhead: [] });
  return { scenario: v.scenario, recipient: v.recipient, form: v.form, evidence: v.evidence, triggerDate: v.triggerDate || null, lang: v.lang };
}
export async function requestConsultation(req, res){
  const lawyerId = int(req.body?.lawyer, 1e12), message = clean(req.body?.message, 1500);
  const caseData = vCase(req.body);
  if (message.length < 10 && !caseData) throw err("message");
  const p = await one("select id, user_id from lawyer_profiles where id = $1 and status = 'approved'", [lawyerId]);
  if (!p) throw err("lawyerNotFound", 404);
  if (p.user_id && Number(p.user_id) === req.user.id) throw err("ownProfile");
  const kb = kbFor("uz"), sc = caseData ? kb.SCENARIO_BY_ID[caseData.scenario] : typeof req.body?.scenario === "string" && kb.SCENARIO_BY_ID[req.body.scenario];
  const format = req.body?.format === "office" ? "office" : "online";
  const c = await one(`insert into consultations(lawyer_id, citizen_id, scenario, domain, format, message, commission_pct, case_data, case_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb, case when $8::jsonb is null then null else now() end) returning id`,
    [p.id, req.user.id, sc?.id || null, sc?.domain || null, format, message || "—", COMMISSION_PCT, caseData ? JSON.stringify(caseData) : null]);
  await q("insert into lawyer_events(lawyer_ref, kind, domain, scenario) values ($1, 'request', $2, $3)", [`y${p.id}`, sc?.domain || null, sc?.id || null]);
  if (caseData){
    await audit(q, { userId: req.user.id, action: "case.share", target: `consultation:${c.id}`, data: { lawyer: Number(p.id), scenario: caseData.scenario }, ip: req.ip });
    stats.record("lawyer", { scenario: sc.id, domain: sc.domain, ip: req.ip });      // ochiq statistika: faqat soha sanog‘i
  }
  res.status(201).json({ ok: true, id: Number(c.id), next: caseData ? `/hisob/ish/${c.id}` : "/hisob" });
}

// Ish paketini faqat ishtirokchilar ko‘radi: fuqaro (egasi) yoki shu profilning yuristi. Admin va moderator — yo‘q (maxfiylik).
export async function caseFor(user, id){
  const c = await one(`select c.*, p.user_id as lawyer_user, p.name as lawyer_name, p.phone as lawyer_phone, p.email as lawyer_email,
      u.name as citizen_name, u.phone as citizen_phone, u.email as citizen_email
      from consultations c join lawyer_profiles p on p.id = c.lawyer_id join users u on u.id = c.citizen_id where c.id = $1`, [int(id, 1e12)]);
  if (!c) return null;
  const side = Number(c.citizen_id) === user.id ? "citizen" : Number(c.lawyer_user) === user.id ? "lawyer" : null;
  return side ? { ...c, side } : null;
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
  // Fuqaro ish paketini istalgan vaqtda qaytarib oladi: ma’lumot bazadan o‘chiriladi, so‘rov o‘zi qoladi
  if (act === "withdraw"){
    const id = int(req.params.id, 1e12);
    const r = await q("update consultations set case_data = null, case_withdrawn_at = now(), updated_at = now() where id = $1 and citizen_id = $2 and case_data is not null", [id, req.user.id]);
    if (!r.rowCount){
      const c = await one("select citizen_id from consultations where id = $1", [id]);
      throw c && Number(c.citizen_id) === req.user.id ? err("badState", 409) : err(c ? "forbidden" : "notFound", c ? 403 : 404);
    }
    await audit(q, { userId: req.user.id, action: "case.withdraw", target: `consultation:${id}`, ip: req.ip });
    return res.json({ ok: true });
  }
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
      if (act === "cancel" || act === "decline"){
        await run("update payments set status = 'cancelled' where consultation_id = $1 and status = 'pending'", [id]);
        // Kelishuv bo‘lmadi — fuqaroning ish ma’lumotlari yuristda qolmaydi
        await run("update consultations set case_data = null, case_withdrawn_at = coalesce(case_withdrawn_at, now()) where id = $1 and case_data is not null", [id]);
      }
    }
  });
  res.json({ ok: true });
}
export async function consultationsFor(user){
  const lawyer = await one("select id, status from lawyer_profiles where user_id = $1", [user.id]);
  const asCitizen = (await q(`select c.*, (c.case_data is not null) as has_case, p.name as lawyer_name, p.phone as lawyer_phone, p.email as lawyer_email from consultations c
    join lawyer_profiles p on p.id = c.lawyer_id where c.citizen_id = $1 order by c.created_at desc limit 100`, [user.id])).rows;
  const asLawyer = lawyer ? (await q(`select c.*, (c.case_data is not null) as has_case, u.name as citizen_name, u.phone as citizen_phone, u.email as citizen_email from consultations c
    join users u on u.id = c.citizen_id where c.lawyer_id = $1 order by c.created_at desc limit 200`, [lawyer.id])).rows : [];
  return { lawyer, asCitizen, asLawyer };
}

// ---------- Admin ----------
export async function adminAct(req, res){
  const { kind, act } = req.params, id = int(req.params.id, 1e12);
  if (kind === "practice" && ["add", "remove"].includes(act)) await adminPractice(act, id, req);
  else
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
  else if (kind === "payment") await adminPayment(act, id, req);                // pul amallari: server/billing.js
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
  if (kind !== "payment") await audit(q, { userId: req.user.id, action: `admin.${kind}.${act}`, target: `${kind}:${id}`, data: kind === "user" ? { role: req.body?.role } : null, ip: req.ip });
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
    q("select * from lawyer_profiles where status = 'pending' and phone <> '' order by created_at"),
    q(`select p.*, u.name, u.email from payments p left join users u on u.id = p.user_id where p.status = 'pending' order by p.created_at`),
    q("select id, name, email, role, created_at, last_login_at, email_verified_at, totp_enabled_at from users order by created_at desc limit 50"),
    q(`select s.id, s.plan, s.ends_at, u.name, u.email from subscriptions s join users u on u.id = s.user_id
       where s.status = 'trial' and s.ends_at between now() and now() + interval '7 days' order by s.ends_at`)
  ]);
  const [lastPays, auditRows] = await Promise.all([
    q(`select p.id, p.kind, p.amount, p.status, p.method, p.paid_at, p.created_at, u.name from payments p left join users u on u.id = p.user_id where p.status in ('paid','refunded') order by coalesce(p.paid_at, p.created_at) desc limit 50`),
    q(`select l.at, l.action, l.target, l.data, u.email from audit_log l left join users u on u.id = l.user_id order by l.id desc limit 150`)]);
  const byLawyer = (await q(`select p.id, p.name, p.status, count(c.id)::int total,
      sum((c.status in ('agreed','completed'))::int)::int agreed, sum((c.status = 'completed')::int)::int completed,
      coalesce(sum(case when c.status in ('agreed','completed') then c.offer_price end),0)::bigint value,
      coalesce(sum(case when c.status in ('agreed','completed') then round(c.offer_price * c.commission_pct / 100) end),0)::bigint commission
      from lawyer_profiles p left join consultations c on c.lawyer_id = p.id group by p.id order by total desc, p.id limit 100`)).rows;
  return { roles: roles.rows, newUsers: newUsers.rows, subs: subs.rows, orgSubs: orgSubs.rows, revenue: revenue.rows, mrr: mrr.rows[0],
    cons: cons.rows, consDomain: consDomain.rows, events: lawyers.rows, byLawyer, pending: pending.rows, pendingPay: pendingPay.rows,
    recentUsers: recentUsers.rows, trialEnding: trialEnding.rows, lastPays: lastPays.rows, audit: auditRows.rows };
}
export const regionsList = () => COURTS.regions.map(r => r.name);
export const areaIds = () => new Set(areaList("uz").map(a => a.id));

// Ochiq statistika uchun platforma ko‘rsatkichlari: faqat sanoqlar (ism, aloqa yoki matn yo‘q)
export async function platformStats(period = 30){
  if (!dbEnabled()) return null;
  try {
    const days = [7, 30, 90, 365].includes(Number(period)) ? Number(period) : 30;
    const r = await one(`select
        (select count(*)::int from users) users,
        (select count(*)::int from users where created_at > now() - make_interval(days => $1)) "newUsers",
        (select count(*)::int from lawyer_profiles p where ${VISIBLE_SQL}) lawyers,
        (select count(*)::int from consultations where created_at > now() - make_interval(days => $1)) cons,
        (select count(*)::int from consultations where created_at > now() - make_interval(days => $1) and status in ('agreed','completed')) agreed`, [days]);
    return r;
  } catch (e){ console.error("[stats] platforma:", e.message); return null; }
}
