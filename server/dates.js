const MONTHS = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","oktabr","noyabr","dekabr"];

export const startOfDay = (d = new Date()) => { const r = new Date(d); r.setHours(0,0,0,0); return r; };
export const toISO = d => { const z = n => String(n).padStart(2,"0"); return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`; };
export function parseISO(s){
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y,m,d] = s.split("-").map(Number);
  const r = new Date(y, m-1, d);
  return r.getMonth() === m-1 ? r : null;
}
export const uzDate = d => d ? `${d.getDate()}-${MONTHS[d.getMonth()]} ${d.getFullYear()}-yil` : "";
export const dayDiff = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// Oylar bilan hisoblanadigan muddat oxirgi oyning tegishli sanasida tugaydi; bunday sana bo‘lmasa — oyning oxirgi kuni (MK 9-modda)
export function addMonths(d, n){
  const y = d.getFullYear(), m = d.getMonth() + n, day = d.getDate();
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(day, last));
}
const sundayShift = d => d.getDay() === 0 ? addDays(d, 1) : d;   // oxirgi kun yakshanba bo‘lsa — keyingi ish kuni

// spec: { days | months | years, offsetDays? } yoki { none:true }; eski chaqiruv uchun raqam = oylar
export function deadlineFrom(trigger, spec){
  if (typeof spec === "number") spec = { months: spec };
  if (!spec || spec.none) return null;
  let d = spec.offsetDays ? addDays(trigger, spec.offsetDays) : trigger;
  if (spec.days) d = addDays(d, spec.days);
  if (spec.months) d = addMonths(d, spec.months);
  if (spec.years) d = addMonths(d, spec.years * 12);
  return sundayShift(d);
}
export const termText = spec => !spec || spec.none ? "" : spec.years ? `${spec.years} yil` : spec.months ? `${spec.months} oy` : `${spec.days} kun`;
