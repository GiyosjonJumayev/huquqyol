import { normalize } from "./text.js";

// Matndan summa, davr, bolalar soni va tomon nomini ajratish (AI bo‘lmasa ham ishlaydi)
const WORDNUM = { bir:1, ikki:2, uch:3, "to‘rt":4, tort:4, besh:5 };
export function extractFacts(text){
  const raw = String(text ?? ""), t = normalize(raw), f = {};
  let m;
  if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*(mln|million|milion|mlrd)/))) f.amount = parseFloat(m[1].replace(",", ".")) * (m[2] === "mlrd" ? 1e9 : 1e6);
  else if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*ming/))) f.amount = parseFloat(m[1].replace(",", ".")) * 1e3;
  else if ((m = t.match(/(\d{1,3}(?:[ .]\d{3})+|\d{5,})\s*so‘?m/))) f.amount = Number(m[1].replace(/[ .]/g, ""));
  if ((m = t.match(/(\d+)\s*oy/))) f.months = Number(m[1]);
  if ((m = t.match(/(\d+)\s*yil/))) f.years = Number(m[1]);
  if ((m = t.match(/(\d+|bir|ikki|uch|to‘rt|tort|besh)\s*(ta|nafar)?\s*(bola|farzand)/))) f.children = Number(m[1]) || WORDNUM[m[1]];
  const em = raw.match(/[«"“]([^»"”]{2,60})[»"”]\s*(mchj|aj|xk|qk|yatt)?/i);
  if (em) f.party = ("«" + em[1].trim() + "»" + (em[2] ? " " + em[2] : "")).trim();
  if (f.amount) f.amount = Math.round(f.amount);
  return f;
}

// Umumiy faktlarni holat maydonlariga joylash
export function factsToForm(s, f){
  const keys = new Set(s.fields.map(x => x.k)), form = {};
  if (f.party && s.partyField) form[s.partyField] = f.party;
  if (f.amount && s.amountField) form[s.amountField] = String(f.amount);
  for (const k of ["months", "children", "position"]) if (f[k] != null && keys.has(k)) form[k] = String(f[k]);
  return form;
}
