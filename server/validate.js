// Kiruvchi ma’lumotlarni tekshirish. Har bir holatning maydonlari kb/scenarios.json dagi spetsifikatsiyadan olinadi:
// noma’lum maydonlar tashlanadi, turlar, uzunliklar va variantlar tekshiriladi.
// Xato matni so‘rov tilida chiqadi: ValidationError xabar kaliti va o‘zgaruvchilarni saqlaydi.
import { kbFor } from "./kb.js";
import { parseISO, startOfDay } from "./dates.js";
import { msg, parseLang } from "./i18n.js";

export class ValidationError extends Error {
  constructor(key, vars = {}){ super(msg("uz", key, vars)); this.key = key; this.vars = vars; this.status = 400; }
}

// Boshqaruv belgilari va yo‘nalish belgilarini olib tashlash (yangi qator qoladi)
export const clean = (s, max) => String(s ?? "")
  .replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
  .replace(/[ \t]+/g, " ").trim().slice(0, max);

const kbOf = lang => kbFor(lang === "ru" ? "ru" : "uz");
function scenario(v, lang){
  const { SCENARIO_BY_ID } = kbOf(lang);
  if (typeof v !== "string" || !Object.hasOwn(SCENARIO_BY_ID, v)) throw new ValidationError("scenario");
  return SCENARIO_BY_ID[v];
}
function date(v, label){
  if (v == null || v === "") return undefined;
  const d = parseISO(v);
  if (!d) throw new ValidationError("date", { label });
  if (d > startOfDay()) throw new ValidationError("future", { label });
  if (d < new Date(1990, 0, 1)) throw new ValidationError("old", { label });
  return v;
}
function int(v, min, max, label){
  if (v == null || v === "") return undefined;
  const n = Number(String(v).replace(/[\s ]/g, ""));
  if (!Number.isFinite(n) || n < min || n > max) throw new ValidationError("num", { label });
  return Math.round(n);
}

export function vForm(s, src, lang = "uz"){
  src = src && typeof src === "object" && !Array.isArray(src) ? src : {};
  const kb = kbOf(lang), form = {};
  const local = Object.hasOwn(kb.SCENARIO_BY_ID, s.id) ? kb.SCENARIO_BY_ID[s.id] : s;
  for (const f of kb.fieldsOf(local)){
    const raw = src[f.k];
    if (raw == null || raw === "") continue;
    const label = f.label.replace(/,.*$/, "");
    switch (f.type){
      case "money": { const n = int(raw, 0, 1e12, label); if (n) form[f.k] = String(n); break; }
      case "int":   { const n = int(raw, f.min ?? 0, f.max ?? 1000, label); if (n != null) form[f.k] = String(n); break; }
      case "date":  form[f.k] = date(raw, label); break;
      case "select":
        if (!f.options.some(o => o.v === raw)) throw new ValidationError("option", { label });
        form[f.k] = raw; break;
      case "phone": {
        const v = clean(raw, 40);
        if (v && !/^[+\d\s()-]{7,40}$/.test(v)) throw new ValidationError("phone");
        if (v) form[f.k] = v; break;
      }
      default: { const v = clean(raw, f.type === "textarea" ? 1500 : 200); if (v) form[f.k] = v; }
    }
  }
  return form;
}

const lang = body => parseLang(body?.lang) || "uz";
const dateLabel = l => msg(l === "ru" ? "ru" : "uz", "dateLabel");

export function vAnalyze(body){
  const text = clean(body?.text, 4001);
  if (text.length < 8) throw new ValidationError("short");
  if (text.length > 4000) throw new ValidationError("long");
  return { text, lang: lang(body) };
}

export function vPlan(body){
  const l = lang(body), s = scenario(body?.scenario, l);
  // eski API mosligi: amount/months yuqori darajada kelishi mumkin
  const src = { ...(body?.amount != null ? { amount: body.amount } : {}), ...(body?.months != null ? { months: body.months } : {}), ...(body?.form || {}) };
  return { scenario: s.id, triggerDate: date(body?.triggerDate, dateLabel(l)), form: vForm(s, src, l), lang: l };
}

export function vDocument(body){
  const l = lang(body), s = scenario(body?.scenario, l);
  const recipient = s.docs.some(d => d.id === body?.recipient) ? body.recipient : s.docs[0].id;
  const n = s.evidence.length;
  const evidence = Array.isArray(body?.evidence) ? [...new Set(body.evidence.map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < n))] : [];
  return { scenario: s.id, recipient, form: vForm(s, body?.form, l), evidence, triggerDate: date(body?.triggerDate, dateLabel(l)), lang: l };
}
