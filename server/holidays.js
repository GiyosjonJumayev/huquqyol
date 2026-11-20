// Bayram (ishlanmaydigan) kunlar — MK 9-modda: muddatning oxirgi kuni ishlanmaydigan kunga to‘g‘ri kelsa,
// muddat undan keyingi birinchi ish kunida tugaydi. Huquqiy ma’lumot — o‘zgartirishdan oldin manbani tekshiring.

// Har yili bir xil sanadagi bayramlar (OO-KK): Yangi yil, Xotin-qizlar kuni, Navro‘z, Xotira va qadrlash kuni,
// Mustaqillik kuni, O‘qituvchi va murabbiylar kuni, Konstitutsiya kuni.
export const FIXED_HOLIDAYS = ["01-01", "03-08", "03-21", "05-09", "09-01", "10-01", "12-08"];

// Ko‘chib yuradigan bayramlar (Ramazon hayiti, Qurbon hayiti) — har yili rasmiy e’lon qilingandan KEYIN qo‘shing.
// Taxminiy sanani yozmang: noto‘g‘ri bayram muddatni bir kun KEYINGA suradi va fuqaro muddatni o‘tkazib yuborishi mumkin.
// Sana yo‘q bo‘lsa, muddat ko‘pi bilan bir kun ERTA ko‘rsatiladi — bu xavfsiz tomon.
export const MOVABLE_HOLIDAYS = {
  2026: [
    "2026-03-20",   // Ramazon hayiti — Prezident qarori (norma.uz/qonunchilikda_yangi/ramazon_hayiti_20_martda_nishonlanadi)
    "2026-05-27"    // Qurbon hayiti — Prezident farmoni (uza.uz/uz/posts/muborak-qurbon-hayitini-nishonlash-togrisida_860444)
  ]
  // 2027: hali e’lon qilinmagan (2026-11-20 holatiga). E’lon qilingach shu yerga yoki HOLIDAYS_EXTRA ga qo‘shing.
};

// Qo‘shimcha ishlanmaydigan kunlar muhit o‘zgaruvchisi orqali: HOLIDAYS_EXTRA="2027-03-10,2027-05-16"
let extraSrc = null, extraSet = new Set();
function extraHolidays(){
  const src = process.env.HOLIDAYS_EXTRA || "";
  if (src !== extraSrc){
    extraSrc = src;
    extraSet = new Set(src.split(/[\s,;]+/).filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s)));
  }
  return extraSet;
}

const z = n => String(n).padStart(2, "0");
export function isHoliday(d){
  const y = d.getFullYear(), md = `${z(d.getMonth() + 1)}-${z(d.getDate())}`, iso = `${y}-${md}`;
  return FIXED_HOLIDAYS.includes(md) || (MOVABLE_HOLIDAYS[y] || []).includes(iso) || extraHolidays().has(iso);
}
