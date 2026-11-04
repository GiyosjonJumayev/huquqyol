import { normalize } from "./text.js";

// Matndan summa, davr va ish beruvchi nomini ajratish (LLM bo‘lmasa ham ishlaydi)
export function extractFacts(text){
  const raw = String(text ?? ""), t = normalize(raw), f = {};
  let m;
  if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*(mln|million|milion|mlrd)/))) f.amount = parseFloat(m[1].replace(",", ".")) * (m[2] === "mlrd" ? 1e9 : 1e6);
  else if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*ming/))) f.amount = parseFloat(m[1].replace(",", ".")) * 1e3;
  else if ((m = t.match(/(\d{1,3}(?:[ .]\d{3})+|\d{5,})\s*so‘?m/))) f.amount = Number(m[1].replace(/[ .]/g, ""));
  if ((m = t.match(/(\d+)\s*oy/))) f.months = Number(m[1]);
  if ((m = t.match(/(\d+)\s*yil/))) f.years = Number(m[1]);
  const em = raw.match(/[«"“]([^»"”]{2,60})[»"”]\s*(mchj|aj|xk|qk|yatt)?/i);
  if (em) f.employer = ("«" + em[1].trim() + "»" + (em[2] ? " " + em[2] : "")).trim();
  if (f.amount) f.amount = Math.round(f.amount);
  return f;
}
