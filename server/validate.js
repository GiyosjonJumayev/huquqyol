// Kiruvchi ma’lumotlarni tekshirish: noma’lum maydonlar tashlanadi, turlar va uzunliklar cheklanadi.
import { SCENARIO_BY_ID } from "./kb.js";
import { parseISO, startOfDay } from "./dates.js";

export class ValidationError extends Error { constructor(msg){ super(msg); this.status = 400; } }

// Boshqaruv belgilari va ko‘rinmas belgilarni olib tashlash (yangi qator qoladi)
const clean = (s, max) => String(s ?? "")
  .replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
  .replace(/[ \t]+/g, " ").trim().slice(0, max);

const FORM_LIMITS = { fio:120, address:200, phone:40, employer:120, position:80, boss:120, district:80, empAddress:200, extra:1500 };
const RECIPIENTS = ["employer", "inspection", "court"];

function scenario(v){
  if (typeof v !== "string" || !Object.hasOwn(SCENARIO_BY_ID, v)) throw new ValidationError("Noma’lum holat.");
  return v;
}
function date(v){
  if (v == null || v === "") return undefined;
  const d = parseISO(v);
  if (!d) throw new ValidationError("Sana noto‘g‘ri (YYYY-MM-DD).");
  const now = startOfDay(), min = new Date(now.getFullYear() - 10, 0, 1);
  if (d > now) throw new ValidationError("Sana kelajakda bo‘lishi mumkin emas.");
  if (d < min) throw new ValidationError("Sana juda eski.");
  return v;
}
function int(v, min, max, name){
  if (v == null || v === "") return undefined;
  const n = Number(String(v).replace(/[\s ]/g, ""));
  if (!Number.isFinite(n) || n < min || n > max) throw new ValidationError(`${name} noto‘g‘ri.`);
  return Math.round(n);
}

export function vAnalyze(body){
  const text = clean(body?.text, 4001);
  if (text.length < 8) throw new ValidationError("Vaziyatni bir-ikki gap bilan yozing.");
  if (text.length > 4000) throw new ValidationError("Matn juda uzun (4000 belgigacha).");
  return { text };
}

export function vPlan(body){
  return {
    scenario: scenario(body?.scenario),
    triggerDate: date(body?.triggerDate),
    amount: int(body?.amount, 0, 1e12, "Summa"),
    months: int(body?.months, 1, 60, "Oylar soni")
  };
}

export function vDocument(body){
  const s = scenario(body?.scenario);
  const recipient = RECIPIENTS.includes(body?.recipient) ? body.recipient : SCENARIO_BY_ID[s].documents[0];
  const src = body?.form && typeof body.form === "object" && !Array.isArray(body.form) ? body.form : {};
  const form = {};
  for (const [k, max] of Object.entries(FORM_LIMITS)) if (src[k] != null) form[k] = clean(src[k], max);
  if (form.phone && !/^[+\d\s()-]{7,40}$/.test(form.phone)) throw new ValidationError("Telefon raqami noto‘g‘ri.");
  const amount = int(src.amount, 0, 1e12, "Summa"), months = int(src.months, 1, 60, "Oylar soni");
  if (amount) form.amount = String(amount);
  if (months) form.months = String(months);
  const n = SCENARIO_BY_ID[s].evidence.length;
  const evidence = Array.isArray(body?.evidence) ? [...new Set(body.evidence.map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < n))] : [];
  return { scenario: s, recipient, form, evidence, triggerDate: date(body?.triggerDate) };
}
