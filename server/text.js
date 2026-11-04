// O‘zbek lotin matnini qidiruv uchun normallashtirish
const APOS = /[ʻʼ'`’‘´]/g;
export const normalize = s => String(s ?? "").toLowerCase().replace(APOS, "‘").replace(/\s+/g, " ").trim();

// Qo‘shimchali so‘zlarni birlashtirish uchun oddiy "o‘zak": so‘zning dastlabki 5 harfi
export function tokenize(s){
  return normalize(s)
    .replace(/[^\p{L}\p{N}‘\s-]/gu, " ")
    .split(/[\s-]+/)
    .filter(t => t.length > 1)
    .map(t => t.replace(/‘/g, "").slice(0, 5));
}
