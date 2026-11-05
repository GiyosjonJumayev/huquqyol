// Kiruvchi ma’lumotlarni tekshirish. Har bir holatning maydonlari kb/scenarios.json dagi spetsifikatsiyadan olinadi:
// noma’lum maydonlar tashlanadi, turlar, uzunliklar va variantlar tekshiriladi.
import { SCENARIO_BY_ID, fieldsOf } from "./kb.js";
import { parseISO, startOfDay } from "./dates.js";

export class ValidationError extends Error { constructor(msg){ super(msg); this.status = 400; } }

// Boshqaruv belgilari va yo‘nalish belgilarini olib tashlash (yangi qator qoladi)
export const clean = (s, max) => String(s ?? "")
  .replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
  .replace(/[ \t]+/g, " ").trim().slice(0, max);

function scenario(v){
  if (typeof v !== "string" || !Object.hasOwn(SCENARIO_BY_ID, v)) throw new ValidationError("Noma’lum holat.");
  return SCENARIO_BY_ID[v];
}
function date(v, label = "Sana"){
  if (v == null || v === "") return undefined;
  const d = parseISO(v);
  if (!d) throw new ValidationError(`${label} noto‘g‘ri (YYYY-MM-DD).`);
  const now = startOfDay();
  if (d > now) throw new ValidationError(`${label} kelajakda bo‘lishi mumkin emas.`);
  if (d < new Date(1990, 0, 1)) throw new ValidationError(`${label} juda eski.`);
  return v;
}
function int(v, min, max, name){
  if (v == null || v === "") return undefined;
  const n = Number(String(v).replace(/[\s ]/g, ""));
  if (!Number.isFinite(n) || n < min || n > max) throw new ValidationError(`${name} noto‘g‘ri.`);
  return Math.round(n);
}

export function vForm(s, src){
  src = src && typeof src === "object" && !Array.isArray(src) ? src : {};
  const form = {};
  for (const f of fieldsOf(s)){
    const raw = src[f.k];
    if (raw == null || raw === "") continue;
    const label = f.label.replace(/,.*$/, "");
    switch (f.type){
      case "money": { const n = int(raw, 0, 1e12, label); if (n) form[f.k] = String(n); break; }
      case "int":   { const n = int(raw, f.min ?? 0, f.max ?? 1000, label); if (n != null) form[f.k] = String(n); break; }
      case "date":  form[f.k] = date(raw, label); break;
      case "select":
        if (!f.options.some(o => o.v === raw)) throw new ValidationError(`${label}: noma’lum variant.`);
        form[f.k] = raw; break;
      case "phone": {
        const v = clean(raw, 40);
        if (v && !/^[+\d\s()-]{7,40}$/.test(v)) throw new ValidationError("Telefon raqami noto‘g‘ri.");
        if (v) form[f.k] = v; break;
      }
      default: { const v = clean(raw, f.type === "textarea" ? 1500 : 200); if (v) form[f.k] = v; }
    }
  }
  return form;
}

export function vAnalyze(body){
  const text = clean(body?.text, 4001);
  if (text.length < 8) throw new ValidationError("Vaziyatni bir-ikki gap bilan yozing.");
  if (text.length > 4000) throw new ValidationError("Matn juda uzun (4000 belgigacha).");
  return { text };
}

export function vPlan(body){
  const s = scenario(body?.scenario);
  // eski API mosligi: amount/months yuqori darajada kelishi mumkin
  const src = { ...(body?.amount != null ? { amount: body.amount } : {}), ...(body?.months != null ? { months: body.months } : {}), ...(body?.form || {}) };
  return { scenario: s.id, triggerDate: date(body?.triggerDate), form: vForm(s, src) };
}

export function vDocument(body){
  const s = scenario(body?.scenario);
  const recipient = s.docs.some(d => d.id === body?.recipient) ? body.recipient : s.docs[0].id;
  const n = s.evidence.length;
  const evidence = Array.isArray(body?.evidence) ? [...new Set(body.evidence.map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < n))] : [];
  return { scenario: s.id, recipient, form: vForm(s, body?.form), evidence, triggerDate: date(body?.triggerDate), lang: body?.lang === "cyr" ? "cyr" : "lat" };
}
