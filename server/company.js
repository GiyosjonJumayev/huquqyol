// «Kompaniya» ish joyi: yuristi bo‘lmagan korxona uchun shartnomalar, muddatlar, kiruvchi/chiquvchi xatlar va ichki hujjatlar reestri,
// rekvizitlar (blanka) va tasdiqlangan shablonlardan hujjat (server/kb/practice.json — lex.uz bo‘yicha tekshirilgan baza).
// Ma’lumot tashkilotniki: jamoa a’zolari umumiy ko‘radi; yozish — faol «Kompaniya» / «Tashkilot» / «Firma» obunasi yoki sinov bilan
// (server/access.js need:"pro"), obuna tugasa ham ko‘rish va eksport ochiq qoladi (ma’lumot «garovga» olinmaydi).
// Huquqiy muddatlar o‘ylab topilmaydi: sanalarni foydalanuvchi kiritadi, tizim faqat eslatadi.
import { q, one, tx } from "./db.js";
import { clean, ValidationError } from "./validate.js";
import { audit } from "./billing.js";
import { teamPlan } from "./team.js";
import { PRACTICE } from "./kb.js";
import { toISO, addMonths, parseISO } from "./dates.js";

const err = (key, status = 400, vars) => Object.assign(new ValidationError(key, vars), { status });
// Maydon yorliqlari [uz, ru] — xato matnida va brauzerda maydonni belgilash uchun (field)
const FL = { title: ["Nomi", "Название"], party: ["Kontragent", "Контрагент"], due_date: ["Muddat", "Срок"], start_date: ["Sana", "Дата"], name: ["Nomi", "Название"] };
const fieldErr = (field, key = "required", vars = {}) => Object.assign(err(key, 400, { label: FL[field] || ["", ""], ...vars }), { field });

export const KINDS = ["contract", "deadline", "letter", "doc"];
export const CURRENCIES = ["UZS", "USD", "EUR", "RUB"];
export const REPEATS = ["none", "month", "quarter", "year"];
export const CATS = {
  deadline: ["litsenziya", "ishonchnoma", "hisobot", "shartnoma", "mehnat", "soliq", "sud", "boshqa"],
  letter: ["murojaat", "pretenziya", "sorov", "javob", "xabarnoma", "boshqa"],
  doc: ["ustav", "qoida", "buyruq", "yoriqnoma", "ishonchnoma", "litsenziya", "shartnoma", "qonun", "boshqa"]
};
export const SIZES = ["1-10", "11-50", "51-250", "250+"];
// Kompaniya uchun mos tasdiqlangan shablonlar (advokat maydonlarisiz)
export const COMPANY_TPL = ["bz_buyruq", "m_buyruq", "bz_talab", "sh_bekor", "bz_qaror", "sh_xizmat", "sh_kelishmov", "bz_solish", "ij_dalolat"];
// Faoliyatga oid qonunlar: shu yo‘nalishlardagi aktlar
export const COMPANY_AREAS = ["biznes", "shartnoma", "mehnat", "soliq"];

export const todayISO = () => toISO(new Date());
const DATE = /^\d{4}-\d{2}-\d{2}$/;
function vDate(v, field, required = false){
  const s = String(v ?? "").trim();
  if (!s){ if (required) throw fieldErr(field); return null; }
  const d = DATE.test(s) && parseISO(s);
  if (!d || toISO(d) !== s || d.getFullYear() < 1990 || d.getFullYear() > 2100) throw fieldErr(field, "date");
  return s;
}
const vText = (v, max, field, min = 0) => { const s = clean(v, max); if (s.length < min) throw fieldErr(field); return s || null; };
function vAmount(v){
  const s = String(v ?? "").replace(/[\s '’]/g, "").replace(",", ".");
  if (!s) return null;
  if (!/^\d{1,15}(\.\d{1,2})?$/.test(s)) throw fieldErr("amount", "amount");
  return s;
}
const vInn = v => { const s = String(v ?? "").replace(/\s/g, ""); if (!s) return null; if (!/^(\d{9}|\d{14})$/.test(s)) throw fieldErr("party_inn", "innOrPinfl"); return s; };
const vUrl = v => { const s = clean(v, 500); if (!s) return null; if (!/^https:\/\/[^\s<>"']+$/i.test(s)) throw fieldErr("url", "url"); return s; };
const vInt = (v, def, min, max) => { const n = Math.round(Number(v)); return v === "" || v == null || !Number.isFinite(n) ? def : Math.min(max, Math.max(min, n)); };
const pickOf = (list, v, def) => list.includes(v) ? v : def;

/** Bitta yozuvni tekshirish (turiga qarab). members — tashkilot a’zolari id lari (mas’ul uchun). */
export function vRecord(kind, b, members = []){
  if (!KINDS.includes(kind)) throw err("option", 400, { label: "kind" });
  const assignee = b?.assignee_id ? Number(b.assignee_id) : null;
  if (assignee != null && !members.includes(assignee)) throw fieldErr("assignee_id", "option", { label: "Mas’ul" });
  const r = { kind, title: vText(b?.title, 300, "title", 2), note: vText(b?.note, 4000, "note"), assignee_id: assignee,
    party: null, party_inn: null, number: null, amount: null, currency: null, start_date: null, due_date: null,
    remind_days: 14, repeat: "none", direction: null, category: null, url: null };
  if (kind === "contract"){
    Object.assign(r, { party: vText(b?.party, 300, "party", 2), party_inn: vInn(b?.party_inn), number: vText(b?.number, 60, "number"),
      amount: vAmount(b?.amount), currency: pickOf(CURRENCIES, b?.currency, "UZS"), start_date: vDate(b?.start_date, "start_date"),
      due_date: vDate(b?.due_date, "due_date"), remind_days: vInt(b?.remind_days, 30, 0, 365), url: vUrl(b?.url) });
    if (r.start_date && r.due_date && r.due_date < r.start_date) throw fieldErr("due_date", "dateOrder");
  } else if (kind === "deadline"){
    Object.assign(r, { category: pickOf(CATS.deadline, b?.category, "boshqa"), due_date: vDate(b?.due_date, "due_date", true),
      repeat: pickOf(REPEATS, b?.repeat, "none"), remind_days: vInt(b?.remind_days, 14, 0, 365) });
  } else if (kind === "letter"){
    Object.assign(r, { direction: b?.direction === "out" ? "out" : b?.direction === "in" ? "in" : null, party: vText(b?.party, 300, "party", 2),
      category: pickOf(CATS.letter, b?.category, "boshqa"), number: vText(b?.number, 60, "number"),
      start_date: vDate(b?.start_date, "start_date") || todayISO(), due_date: vDate(b?.due_date, "due_date"), remind_days: vInt(b?.remind_days, 3, 0, 365) });
    if (!r.direction) throw fieldErr("direction", "option", { label: "Yo‘nalish" });
    if (r.due_date && r.due_date < r.start_date) throw fieldErr("due_date", "dateOrder");
  } else {
    Object.assign(r, { category: pickOf(CATS.doc, b?.category, "boshqa"), number: vText(b?.number, 60, "number"), start_date: vDate(b?.start_date, "start_date"),
      due_date: vDate(b?.due_date, "due_date"), remind_days: vInt(b?.remind_days, 30, 0, 365), url: vUrl(b?.url) });
  }
  return r;
}

/** Rekvizitlar (blanka va hujjatlarni avtomatik to‘ldirish uchun). */
export function vRequisites(b){
  const name = clean(b?.name, 200);
  if (name.length < 2) throw fieldErr("name");
  const inn = String(b?.inn ?? "").replace(/\s/g, "");
  if (inn && !/^\d{9}$/.test(inn)) throw fieldErr("inn", "inn");
  const acc = String(b?.account ?? "").replace(/\s/g, ""), mfo = String(b?.mfo ?? "").replace(/\s/g, "");
  if (acc && !/^\d{20}$/.test(acc)) throw fieldErr("account", "account");
  if (mfo && !/^\d{5}$/.test(mfo)) throw fieldErr("mfo", "mfo");
  const phone = clean(b?.phone, 40);
  if (phone && !/^[+\d\s()-]{7,40}$/.test(phone)) throw fieldErr("phone", "phone");
  const email = clean(b?.email, 254);
  if (email && !/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email)) throw fieldErr("email", "email");
  return { name, inn: inn || null, size: pickOf(SIZES, b?.size, null),
    req: { city: clean(b?.city, 100), address: clean(b?.address, 300), director: clean(b?.director, 120), directorPos: clean(b?.directorPos, 80),
      bank: clean(b?.bank, 200), account: acc, mfo, phone, email, oked: clean(b?.oked, 20) } };
}

// ---------- Kontekst ----------
const SEL = `id, kind, title, party, party_inn, number, amount, currency, to_char(start_date, 'YYYY-MM-DD') as start_date, to_char(due_date, 'YYYY-MM-DD') as due_date,
  remind_days, repeat, direction, category, status, assignee_id, url, note, created_at, updated_at, done_at`;
const num = r => r && { ...r, id: Number(r.id), assignee_id: r.assignee_id == null ? null : Number(r.assignee_id) };
const membersOf = orgId => q("select id, name, email, org_role from users where org_id = $1 order by (org_role = 'owner') desc, name", [orgId]).then(r => r.rows.map(m => ({ ...m, id: Number(m.id) })));

/** Sahifa uchun: tashkilot, tarif (yozish huquqi), a’zolar. */
export async function companyCtx(user){
  if (!user?.org_id) return null;
  const [org, plan, members] = await Promise.all([one("select id, name, kind, inn, req, size from organizations where id = $1", [user.org_id]), teamPlan(user.org_id), membersOf(user.org_id)]);
  if (!org) return null;
  return { org: { ...org, id: Number(org.id), req: org.req || {} }, plan, write: !!plan, members, owner: user.org_role === "owner" };
}
const needOrg = req => { if (!req.user.org_id) throw err("needTeam", 402); return req.user.org_id; };

/** Reestr ro‘yxati: tur, holat (active|done|all), qidiruv, muddat (soon|overdue). */
export async function listRecords(orgId, kind, { holat = "active", qidir = "", muddat = "", today = todayISO() } = {}){
  const p = [orgId, kind], w = ["org_id = $1", "kind = $2"];
  if (holat === "active" || holat === "done") { p.push(holat); w.push(`status = $${p.length}`); }
  else w.push("status <> 'cancelled'");
  const s = clean(qidir, 100);
  if (s){ p.push(`%${s.replace(/[\\%_]/g, c => "\\" + c)}%`); w.push(`(title ilike $${p.length} or party ilike $${p.length} or number ilike $${p.length} or party_inn ilike $${p.length})`); }
  if (muddat === "overdue" || muddat === "soon"){
    p.push(today); const d = `$${p.length}::date`;
    w.push(muddat === "overdue" ? `status = 'active' and due_date < ${d}` : `status = 'active' and due_date between ${d} and ${d} + remind_days`);
  }
  const r = await q(`select ${SEL} from org_records where ${w.join(" and ")} order by (status = 'active') desc, due_date asc nulls last, id desc limit 500`, p);
  return r.rows.map(num);
}
export const getRecord = async (orgId, id) => num(await one(`select ${SEL} from org_records where org_id = $1 and id = $2`, [orgId, Number.isSafeInteger(Number(id)) ? Number(id) : 0]));

/** Bosh panel: ogohlantirishlar, sonlar, yaqin muddatlar, boshlash ro‘yxati. */
export async function dashboard(orgId, today = todayISO()){
  const [counts, sums, upcoming, letters, firsts] = await Promise.all([
    q(`select kind, count(*) filter (where status = 'active')::int as active,
         count(*) filter (where status = 'active' and due_date < $2::date)::int as overdue,
         count(*) filter (where status = 'active' and due_date between $2::date and $2::date + remind_days)::int as soon
       from org_records where org_id = $1 group by kind`, [orgId, today]),
    q(`select currency, sum(amount)::text as total, count(*)::int as n from org_records where org_id = $1 and kind = 'contract' and status = 'active' and amount is not null
       and (due_date is null or due_date >= $2::date) group by currency order by currency`, [orgId, today]),
    q(`select ${SEL} from org_records where org_id = $1 and status = 'active' and due_date is not null and due_date <= $2::date + greatest(remind_days, 30)
       order by due_date asc limit 12`, [orgId, today]),
    q(`select count(*) filter (where direction = 'in')::int as inn, count(*) filter (where direction = 'out')::int as out from org_records
       where org_id = $1 and kind = 'letter' and start_date >= date_trunc('month', $2::date)`, [orgId, today]),
    one(`select bool_or(kind = 'contract') as contract, bool_or(kind = 'deadline') as deadline, bool_or(kind = 'letter' and direction = 'out') as letter from org_records where org_id = $1`, [orgId])
  ]);
  const by = Object.fromEntries(KINDS.map(k => [k, { active: 0, overdue: 0, soon: 0 }]));
  for (const r of counts.rows) by[r.kind] = r;
  return { by, sums: sums.rows, upcoming: upcoming.rows.map(num), letters: letters.rows[0] || { inn: 0, out: 0 }, firsts: firsts || {},
    overdue: KINDS.reduce((n, k) => n + by[k].overdue, 0), soon: KINDS.reduce((n, k) => n + by[k].soon, 0) };
}

// ---------- Yozish ----------
const COLS = ["title", "party", "party_inn", "number", "amount", "currency", "start_date", "due_date", "remind_days", "repeat", "direction", "category", "assignee_id", "url", "note"];
async function nextLetterNo(run, orgId, direction, date){
  await run("select id from organizations where id = $1 for update", [orgId]);       // bir vaqtda ikki xat — ikki xil raqam
  const y = date.slice(0, 4);
  const n = (await run("select count(*)::int as n from org_records where org_id = $1 and kind = 'letter' and direction = $2 and extract(year from start_date) = $3", [orgId, direction, Number(y)])).rows[0].n;
  return `${direction === "in" ? "K" : "Ch"}-${y}/${String(n + 1).padStart(3, "0")}`;
}
async function insertRecord(run, orgId, userId, r){
  if (r.kind === "letter" && !r.number) r.number = await nextLetterNo(run, orgId, r.direction, r.start_date);
  const vals = COLS.map(c => r[c] ?? null);
  vals[COLS.indexOf("remind_days")] = r.remind_days; vals[COLS.indexOf("repeat")] = r.repeat;
  const row = (await run(`insert into org_records(org_id, kind, created_by, ${COLS.join(", ")}) values ($1, $2, $3, ${COLS.map((_, i) => `$${i + 4}`).join(", ")}) returning id, number`,
    [orgId, r.kind, userId, ...vals])).rows[0];
  return { id: Number(row.id), number: row.number };
}
const SECTION = { contract: "shartnomalar", deadline: "muddatlar", letter: "xatlar", doc: "kutubxona" };

export async function createRecord(req, res){
  const orgId = needOrg(req), members = (await membersOf(orgId)).map(m => m.id);
  const r = vRecord(req.body?.kind, req.body, members);
  const out = await tx(async run => {
    if ((await run("select count(*)::int as n from org_records where org_id = $1", [orgId])).rows[0].n >= 20000) throw err("tooMany", 409);
    const x = await insertRecord(run, orgId, req.user.id, r);
    await audit(run, { userId: req.user.id, action: "company.create", target: `record:${x.id}`, data: { kind: r.kind }, ip: req.ip });
    return x;
  });
  res.status(201).json({ ok: true, id: out.id, number: out.number, next: `/kompaniya?b=${SECTION[r.kind]}` });
}
export async function updateRecord(req, res){
  const orgId = needOrg(req), cur = await getRecord(orgId, req.params.id);
  if (!cur) throw err("notFound", 404);
  const members = (await membersOf(orgId)).map(m => m.id);
  const r = vRecord(cur.kind, { ...req.body, direction: req.body?.direction || cur.direction }, members);
  if (r.kind === "letter" && !r.number) r.number = cur.number;
  await tx(async run => {
    await run(`update org_records set ${COLS.map((c, i) => `${c} = $${i + 3}`).join(", ")}, updated_at = now() where org_id = $1 and id = $2`, [orgId, cur.id, ...COLS.map(c => r[c] ?? null)]);
    await audit(run, { userId: req.user.id, action: "company.update", target: `record:${cur.id}`, ip: req.ip });
  });
  res.json({ ok: true, id: cur.id, next: `/kompaniya?b=${SECTION[cur.kind]}` });
}
const STEP = { month: 1, quarter: 3, year: 12 };
export async function actRecord(req, res){
  const orgId = needOrg(req), act = req.params.act;
  if (!["done", "reopen", "delete"].includes(act)) throw err("notFound", 404);
  const cur = await getRecord(orgId, req.params.id);
  if (!cur) throw err("notFound", 404);
  let next = null;
  await tx(async run => {
    if (act === "delete") await run("delete from org_records where org_id = $1 and id = $2", [orgId, cur.id]);
    else if (act === "reopen") await run("update org_records set status = 'active', done_at = null, updated_at = now() where org_id = $1 and id = $2", [orgId, cur.id]);
    else {
      if (cur.status !== "active") throw err("conflict", 409);
      await run("update org_records set status = 'done', done_at = now(), updated_at = now() where org_id = $1 and id = $2", [orgId, cur.id]);
      // Takrorlanadigan muddat: keyingisi avtomatik yaratiladi (oy oxiri — addMonths qoidasi bo‘yicha)
      if (cur.repeat !== "none" && cur.due_date){
        const due = toISO(addMonths(parseISO(cur.due_date), STEP[cur.repeat]));
        next = (await insertRecord(run, orgId, req.user.id, { ...cur, due_date: due, status: "active" })).id;
      }
    }
    await audit(run, { userId: req.user.id, action: `company.${act}`, target: `record:${cur.id}`, ip: req.ip });
  });
  res.json({ ok: true, nextId: next });
}
export async function saveRequisites(req, res){
  const orgId = needOrg(req);
  if (req.user.org_role !== "owner") throw err("forbidden", 403);                    // rekvizitlarni faqat egasi o‘zgartiradi
  const v = vRequisites(req.body);
  await q("update organizations set name = $2, inn = $3, size = $4, req = $5::jsonb where id = $1", [orgId, v.name, v.inn, v.size, JSON.stringify(v.req)]);
  await audit(q, { userId: req.user.id, action: "company.requisites", target: `org:${orgId}`, ip: req.ip });
  res.json({ ok: true, next: "/kompaniya?b=rekvizitlar&saqlandi=1" });
}

// ---------- Hujjat shablonlari ----------
const LBL = {
  client: ["Kompaniyamiz (tomon)", "Наша компания (сторона)"], other: ["Kontragent (ikkinchi tomon)", "Контрагент (вторая сторона)"],
  otherAddr: ["Kontragent manzili", "Адрес контрагента"], org: ["Kompaniya nomi", "Название компании"], person: ["Shaxs F.I.Sh. (xodim, ishtirokchi yoki mas’ul)", "ФИО (работник, участник или ответственный)"],
  number: ["Hujjat raqami", "Номер документа"], subject: ["Mavzu (qisqa)", "Тема (кратко)"], decision: ["Shartnoma (raqami va sanasi)", "Договор (номер и дата)"]
};
export function companyTemplates(lang = "uz"){
  const i = lang === "ru" ? 1 : 0;
  return COMPANY_TPL.map(id => PRACTICE.templates.find(t => t.id === id)).filter(Boolean).map(t => ({
    id: t.id, name: t.name[i], title: t.title?.[i] || "", to: t.to?.[i] || [], text: t.text[i],
    fields: t.fields.map(k => ({ k, label: (LBL[k] || PRACTICE.fields[k]?.t || [k, k])[i], area: PRACTICE.fields[k]?.type === "area" }))
  }));
}
/** Rekvizitlardan maydonlarni oldindan to‘ldirish. */
export function prefill(org, today = new Date()){
  const r = org.req || {}, z = n => String(n).padStart(2, "0");
  return { org: org.name, client: org.name, inn: org.inn || "", place: r.city || "", date: `${z(today.getDate())}.${z(today.getMonth() + 1)}.${today.getFullYear()}`,
    position: r.directorPos || "" };
}
export const letterhead = org => {
  const r = org.req || {};
  return [org.name, [org.inn && `STIR ${org.inn}`, r.oked && `OKED ${r.oked}`, r.address].filter(Boolean).join(" · "),
    [r.account && `h/r ${r.account}`, r.bank, r.mfo && `MFO ${r.mfo}`].filter(Boolean).join(", "), [r.phone, r.email].filter(Boolean).join(" · ")].filter(Boolean).map(s => s.slice(0, 120));
};
const fill = (s, v) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ? String(v[k]) : "________");
/** Shablonni to‘ldirish: { title, to, text, name, needsLetter } — qolgani customModel (server/documents.js). */
export function fillTemplate(tplId, values, org, lang = "uz"){
  const t = companyTemplates(lang).find(x => x.id === tplId);
  if (!t) throw err("option", 400, { label: "Shablon" });
  const v = {};
  for (const f of t.fields) v[f.k] = clean(values?.[f.k], f.area ? 4000 : 400);
  const r = org.req || {};
  let text = fill(t.text, v);
  if (t.to.length && (r.director || r.directorPos)) text += `\n\n${r.directorPos || (lang === "ru" ? "Руководитель" : "Rahbar")} ____________ ${r.director || ""}`.trimEnd();
  return { name: t.name, title: t.title, to: t.to.map(l => fill(l, v)), text, letter: t.to.length > 0, party: v.other || "" };
}

// ---------- Eksport ----------
const CSV_COLS = {
  contract: ["number", "title", "party", "party_inn", "amount", "currency", "start_date", "due_date", "status", "assignee", "note"],
  deadline: ["title", "category", "due_date", "repeat", "remind_days", "status", "assignee", "note"],
  letter: ["number", "direction", "start_date", "party", "title", "category", "due_date", "status", "assignee", "note"],
  doc: ["category", "title", "number", "start_date", "due_date", "url", "status", "note"]
};
// Excel formula in’ektsiyasidan himoya: =, +, -, @ bilan boshlanadigan katak matn sifatida
const cell = v => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",;\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCsv(kind, rows, members){
  const who = new Map(members.map(m => [m.id, m.name])), cols = CSV_COLS[kind];
  return "﻿" + [cols.join(","), ...rows.map(r => cols.map(c => cell(c === "assignee" ? who.get(r.assignee_id) || "" : r[c])).join(","))].join("\r\n") + "\r\n";
}
const icsEsc = s => String(s ?? "").replace(/[\\;,]/g, c => "\\" + c).replace(/\r?\n/g, "\\n");
export function toIcs(rows, orgName, host = "huquqyol"){
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ev = rows.filter(r => r.due_date && r.status === "active").map(r => [
    "BEGIN:VEVENT", `UID:org-${r.id}@${host}`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${r.due_date.replace(/-/g, "")}`,
    `SUMMARY:${icsEsc(`${r.title}${r.party ? ` — ${r.party}` : ""}`)}`, r.note ? `DESCRIPTION:${icsEsc(r.note.slice(0, 500))}` : null,
    r.remind_days ? `BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${icsEsc(r.title)}\r\nTRIGGER:-P${r.remind_days}D\r\nEND:VALARM` : null, "END:VEVENT"].filter(Boolean).join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HuquqYol//Kompaniya//UZ", `X-WR-CALNAME:${icsEsc(orgName)}`, ...ev, "END:VCALENDAR"].join("\r\n") + "\r\n";
}
export const allActive = orgId => q(`select ${SEL} from org_records where org_id = $1 and status = 'active' and due_date is not null order by due_date`, [orgId]).then(r => r.rows.map(num));

// ---------- Kunlik eslatma (server/jobs.js) ----------
/** Bugun eslatiladigan yozuvlar: muddati o‘tgan yoki eslatma oynasiga kirgan, faol tarifli tashkilotlarda. */
export async function digestRows(run, today = todayISO()){
  return (await run(`select r.org_id, o.name as org_name, r.title, r.party, to_char(r.due_date, 'YYYY-MM-DD') as due_date, r.assignee_id, a.email as assignee_email,
      (select array_agg(u.email) from users u where u.org_id = r.org_id and u.org_role = 'owner') as owners
    from org_records r join organizations o on o.id = r.org_id left join users a on a.id = r.assignee_id and a.org_id = r.org_id
    where r.status = 'active' and r.due_date is not null and r.due_date <= $1::date + r.remind_days and (o.digest_on is null or o.digest_on < $1::date)
      and exists(select 1 from subscriptions s where s.org_id = r.org_id and s.plan in ('firma','biznes','org') and s.status in ('active','trial') and (s.ends_at is null or s.ends_at > now()))
    order by r.org_id, r.due_date limit 5000`, [today])).rows;
}
/** Qatorlarni xatlarga guruhlash: egasi — hammasini, mas’ul — faqat o‘zinikini. */
export function groupDigest(rows){
  const mails = new Map(), add = (to, org, r) => { const k = `${to}|${org}`; if (!mails.has(k)) mails.set(k, { to, org, items: [] }); mails.get(k).items.push(r); };
  for (const r of rows){
    for (const o of r.owners || []) add(o, r.org_name, r);
    if (r.assignee_email && !(r.owners || []).includes(r.assignee_email)) add(r.assignee_email, r.org_name, r);
  }
  return [...mails.values()];
}

/** Shablondan tayyorlangan chiquvchi xatni jurnalga yozish (raqam avtomatik). */
export const insertLetter = (run, orgId, userId, { title, party }) =>
  insertRecord(run, orgId, userId, { kind: "letter", title: clean(title, 300), party: clean(party, 300) || null, direction: "out", category: "boshqa",
    start_date: todayISO(), due_date: null, remind_days: 3, repeat: "none", number: null });
