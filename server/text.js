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

// O‘zbek kirill matnini lotinga o‘girish (qidiruv uchun). Rus so‘zlari ham lotinlashadi, lekin ular
// alohida ruscha kalit so‘zlar bilan ham qidiriladi, shuning uchun asl matn ham saqlanadi.
const C2L = { а:"a", б:"b", в:"v", г:"g", д:"d", е:"e", ё:"yo", ж:"j", з:"z", и:"i", й:"y", к:"k", л:"l", м:"m", н:"n", о:"o", п:"p",
  р:"r", с:"s", т:"t", у:"u", ф:"f", х:"x", ц:"ts", ч:"ch", ш:"sh", щ:"sh", ъ:"’", ы:"i", ь:"", э:"e", ю:"yu", я:"ya",
  ў:"o‘", қ:"q", ғ:"g‘", ҳ:"h" };
export const UZ_CYR = /[ўқғҳЎҚҒҲ]/;
export const toLatin = s => String(s ?? "").replace(/[\u0400-\u04FF]/g, ch => {
  const l = C2L[ch.toLowerCase()]; if (l == null) return ch;
  return ch === ch.toLowerCase() ? l : l.charAt(0).toUpperCase() + l.slice(1);
});
