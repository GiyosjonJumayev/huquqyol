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

// MK 9-modda: oylar bilan hisoblanadigan muddat oxirgi oyning tegishli sanasida tugaydi;
// bunday sana bo‘lmasa — oyning oxirgi kuni.
export function addMonths(d, n){
  const y = d.getFullYear(), m = d.getMonth() + n, day = d.getDate();
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(day, last));
}
// Oxirgi kun ishlanmaydigan kunga tushsa — keyingi birinchi ish kuni (yakshanba hisobga olinadi).
export function deadlineFrom(trigger, months){
  let d = addMonths(trigger, months);
  if (d.getDay() === 0) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return d;
}
