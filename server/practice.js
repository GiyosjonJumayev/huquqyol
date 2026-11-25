// Yurist yo‘nalishi (mutaxassislik): tanlangan sohaga oid qonun, nizom, buyruq va Plenum qarorlari, shablonlar, normalar,
// muddatlar, idoralar va ish ro‘yxati. Baza — server/kb/practice.json (scripts/kb_practice.py, lex.uz bo‘yicha tekshirilgan)
// + admin qo‘shgan hujjatlar (practice_acts). Ro‘yxat bir marta yuboriladi, saralash brauzerda darhol bajariladi.
import { q, one, dbEnabled } from "./db.js";
import { clean, ValidationError } from "./validate.js";
import { areaList } from "./business.js";
import { kbFor, PRACTICE } from "./kb.js";
import { toCyrillic } from "../public/translit.js";
import { termText, fmtDate } from "../public/i18n.js";
import { parseISO } from "./dates.js";

const err = (key, status = 400, vars) => Object.assign(new ValidationError(key, vars), { status });
export const AREA_IDS = new Set(PRACTICE.areas);
const TYPE_IDS = new Set(PRACTICE.types.map(t => t.id));
const pick = (pair, lang) => lang === "ru" ? pair[1] : lang === "cyr" ? toCyrillic(pair[0]) : pair[0];
export const cleanAreas = v => Array.isArray(v) ? [...new Set(v.filter(a => AREA_IDS.has(a)))].slice(0, 10) : [];
export const actTypes = lang => PRACTICE.types.map(t => ({ id: t.id, title: pick(t.t, lang) }));

// ---------- Admin qo‘shgan hujjatlar ----------
export async function customActs(){
  if (!dbEnabled()) return [];
  try {
    return (await q(`select id, type, title_uz, title_ru, num, to_char(act_date, 'YYYY-MM-DD') as date, url, areas from practice_acts order by id desc limit 500`)).rows
      .map(r => ({ id: `c${r.id}`, dbId: Number(r.id), type: r.type, t: [r.title_uz, r.title_ru || r.title_uz], num: r.num || "", date: r.date || "", url: r.url, areas: r.areas, common: false, custom: true }));
  } catch (e){ console.error("[practice]", e.message); return []; }
}
// Faqat rasmiy manbalar: lex.uz va *.gov.uz / sud.uz
export function officialUrl(v){
  try {
    const u = new URL(String(v));
    return u.protocol === "https:" && !u.port && !u.username && /^(?:(?:www\.)?lex\.uz|(?:[a-z0-9-]+\.)*gov\.uz|(?:[a-z0-9-]+\.)?sud\.uz)$/.test(u.hostname) ? u.href : null;
  } catch { return null; }
}
export function vAct(b){
  const type = TYPE_IDS.has(b?.type) ? b.type : null, areas = cleanAreas(b?.areas), url = officialUrl(clean(b?.url, 300));
  const uz = clean(b?.titleUz, 300), ru = clean(b?.titleRu, 300), num = clean(b?.num, 40), date = clean(b?.date, 10);
  if (uz.length < 5) throw err("required", 400, { label: "Nomi" });
  if (!type) throw err("option", 400, { label: "Turi" });
  if (!areas.length) throw err("areas");
  if (!url) throw err("officialUrl");
  if (date && (!/^\d{4}-\d\d-\d\d$/.test(date) || !parseISO(date))) throw err("date", 400, { label: "Sana" });
  return { type, uz, ru, num, date: date || null, url, areas };
}
export async function adminPractice(act, id, req){
  if (act === "add"){
    const v = vAct(req.body);
    const dup = PRACTICE.acts.some(a => a.url === v.url) || await one("select 1 from practice_acts where url = $1", [v.url]);
    if (dup) throw err("actExists", 409);
    await q("insert into practice_acts(type, title_uz, title_ru, num, act_date, url, areas, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8)",
      [v.type, v.uz, v.ru || null, v.num, v.date, v.url, v.areas, req.user.id]);
  } else if (!(await q("delete from practice_acts where id = $1", [id])).rowCount) throw err("notFound", 404);
}

// ---------- Sanoqlar (profil muharriri va yurist paneli uchun) ----------
export function practiceCounts(lang, extra = []){
  const acts = [...extra, ...PRACTICE.acts];
  return Object.fromEntries(areaList(lang).filter(a => AREA_IDS.has(a.id)).map(a => {
    const mine = acts.filter(x => x.areas.includes(a.id)), n = (...types) => mine.filter(x => types.includes(x.type)).length;
    return [a.id, { title: a.title, law: n("kodeks", "qonun"), reg: n("qaror", "nizom"), order: n("buyruq"), plenum: n("plenum"),
      tpl: PRACTICE.templates.filter(x => x.areas.includes(a.id)).length, top: mine.filter(x => !x.common).sort((x, y) => x.areas.length - y.areas.length).slice(0, 3).map(x => pick(x.t, lang)) }];
  }));
}

// ---------- To‘liq baza (til bo‘yicha) ----------
const YEAR = 365 * 864e5;
const isNew = (date, now) => !!date && now - new Date(date + "T00:00:00Z").getTime() < YEAR;
function staticPart(lang){
  const l = lang === "ru" ? "ru" : "uz", i = l === "ru" ? 1 : 0, kb = kbFor(l);
  const p = x => pick(x, lang), cy = s => lang === "cyr" ? toCyrillic(String(s ?? "")) : (s ?? "");
  const areasBy = key => {
    const m = new Map();
    for (const s of kb.SCENARIOS) for (const id of s[key] || []) m.set(id, (m.get(id) || new Set()).add(s.domain));
    return [...m];
  };
  return {
    lang, checked: cy(fmtDate(parseISO(PRACTICE.checked), l)),
    types: actTypes(lang),
    // Shablon matni kirillda ham lotincha yuboriladi: {{kalit}} lar buzilmasligi uchun brauzer to‘ldirgandan keyin o‘giradi
    templates: PRACTICE.templates.map(t => ({ id: t.id, areas: t.areas, common: t.common, name: p(t.name), title: t.title[i], to: t.to[i], text: t.text[i], fields: t.fields })),
    fields: Object.fromEntries(Object.entries(PRACTICE.fields).map(([k, f]) => [k, { label: p(f.t), type: f.type, src: f.src }])),
    checklists: Object.fromEntries(Object.entries(PRACTICE.checklists).map(([a, list]) => [a, list.map(p)])),
    norms: areasBy("norms").map(([id, set]) => { const n = kb.NORM_BY_ID[id]; return { id, areas: [...set], article: cy(n.article), title: cy(n.title), text: cy(n.text), law: cy(n.lawName), url: n.lawUrl || "" }; }),
    scenarios: kb.SCENARIOS.map(s => ({ id: s.id, areas: [s.domain], title: cy(s.title), trigger: cy(s.trigger), none: !!s.deadline.none,
      term: s.deadline.none ? "" : cy(termText(s.deadline, l)), note: cy(s.deadline.note), docs: s.docs.map(d => cy(d.label)), evidence: s.evidence.map(cy) })),
    offices: areasBy("offices").filter(([id]) => kb.OFFICES[id]).map(([id, set]) => { const o = kb.OFFICES[id];
      return { id, areas: [...set], name: cy(o.name), role: cy(o.role), address: cy(o.address), hours: cy(o.hours),
        phones: (o.phones || []).map(x => ({ label: cy(x.label), text: x.text, tel: x.tel })), links: (o.links || []).map(x => ({ label: cy(x.label), url: x.url })) }; })
  };
}
const STATIC = new Map();
const staticFor = lang => { if (!STATIC.has(lang)) STATIC.set(lang, staticPart(lang)); return STATIC.get(lang); };
export function practiceData(lang, extra = [], now = Date.now()){
  const acts = [...extra, ...PRACTICE.acts].map(a => ({ id: a.id, type: a.type, title: pick(a.t, lang), num: a.num, date: a.date, url: a.url, areas: a.areas, common: a.common, isNew: isNew(a.date, now), custom: !!a.custom }));
  return { ...staticFor(lang), areas: areaList(lang).filter(a => AREA_IDS.has(a.id)), acts };
}
export async function getPractice(req, res){
  const lawyer = req.user.role === "lawyer";
  const [extra, prof] = await Promise.all([customActs(), lawyer ? one("select name, firm, license, phone, areas from lawyer_profiles where user_id = $1", [req.user.id]) : null]);
  res.set({ "Cache-Control": "private, no-store", Vary: "Cookie, Accept-Language" }).json({
    ...practiceData(req.lang, extra), mine: lawyer ? cleanAreas(prof?.areas || []) : null,
    profile: { name: prof?.name || req.user.name, firm: prof?.firm || "", license: prof?.license || "", phone: prof?.phone || req.user.phone || "" }
  });
}
