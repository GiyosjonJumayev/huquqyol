import { SCENARIO_BY_ID, NORM_BY_ID } from "./kb.js";
import { addMonths, dayDiff, deadlineFrom, parseISO, startOfDay, toISO, uzDate } from "./dates.js";

export const CB_RATE = Number(process.env.CB_RATE || 14); // MB asosiy stavkasi, 2026-yil 29-iyul qarori

export function riskLevel(daysLeft){
  if (daysLeft < 0) return { level:"expired", label:"Muddat o‘tgan", tip:"Baribir sudga boring va uzrli sababni ko‘rsatib, muddatni tiklashni so‘rang." };
  if (daysLeft <= 14) return { level:"high", label:"Shoshiling", tip:"Talabnoma bilan bir vaqtda sudga da’vo tayyorlang." };
  if (daysLeft <= 45) return { level:"medium", label:"Vaqt kam", tip:"Inspeksiya javobini kutib, sud muddatini o‘tkazib yubormang." };
  return { level:"low", label:"Vaqt yetarli", tip:"Avval ish beruvchi va inspeksiya orqali hal qilishga urinib ko‘ring." };
}

// MK 333-modda: har oy qarzi o‘z to‘lov kunidan hisoblanadi.
// low — yillik stavka ÷ 365; high — har kun uchun stavkaning 10%i (amaliyotdagi qat’iy talqin).
export function compensation({ amount, months = 1, trigger, today = new Date(), rate = CB_RATE }){
  amount = Math.max(0, Number(amount) || 0);
  months = Math.max(1, Math.min(60, Math.round(Number(months) || 1)));
  const share = amount / months;
  let units = 0, maxDays = 0;
  for (let i = 0; i < months; i++){
    const d = dayDiff(addMonths(trigger, i), today);
    if (d > 0){ units += share * d; maxDays = Math.max(maxDays, d); }
  }
  return {
    rate, maxDelayDays: maxDays,
    low: Math.round(units * rate / 100 / 365),
    high: Math.round(units * rate / 100 * 0.10)
  };
}

export function buildPlan({ scenario, triggerDate, amount, months, today = new Date() }){
  const s = SCENARIO_BY_ID[scenario];
  if (!s) throw Object.assign(new Error("Noma’lum holat"), { status: 400 });
  const now = startOfDay(today);
  const trigger = parseISO(triggerDate) || addMonths(now, -1);
  const deadline = deadlineFrom(trigger, s.deadlineMonths);
  const daysLeft = dayDiff(now, deadline);
  const total = Math.max(1, dayDiff(trigger, deadline));
  return {
    scenario: s.id,
    info: { title:s.title, short:s.short, lead:s.lead, trigger:s.trigger, compensation:s.compensation, documents:s.documents },
    trigger: toISO(trigger),
    deadline: toISO(deadline), deadlineText: uzDate(deadline),
    deadlineMonths: s.deadlineMonths,
    daysLeft, progress: Math.min(1, Math.max(0, dayDiff(trigger, now) / total)),
    risk: riskLevel(daysLeft),
    steps: s.steps.map(st => ({ ...st, when: st.when.replace("{deadline}", uzDate(deadline)) })),
    norms: s.norms.map(id => NORM_BY_ID[id]),
    evidence: s.evidence,
    compensation: s.compensation && amount ? compensation({ amount, months, trigger, today: now }) : null
  };
}
