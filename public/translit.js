// O‘zbek lotin → kirill transliteratsiyasi. Brauzer ham, server ham shu faylni ishlatadi.
// Qoidalar: o‘→ў, g‘→ғ, sh→ш, ch→ч, yo/yu/ya/ye→ё/ю/я/е, so‘z boshida e→э, tutuq belgisi→ъ,
// rus tilidan kirgan so‘zlar uchun kichik lug‘at va "-tsiya" → "-ция".

const APOS = "[ʻʼ'`’‘´]";
// Rus tilidan o‘zlashgan so‘zlar (o‘zak bo‘yicha)
const LOAN = [
  ["inspeksiya", "инспекция"], ["inspektor", "инспектор"], ["kompensatsiya", "компенсация"],
  ["mediatsiya", "медиация"], ["prokuratura", "прокуратура"], ["prokuror", "прокурор"],
  ["kodeks", "кодекс"], ["konstitutsiya", "конституция"], ["sertifikat", "сертификат"],
  ["telefon", "телефон"], ["elektron", "электрон"], ["respublika", "республика"],
  ["oktabr", "октябр"], ["sentabr", "сентябр"], ["noyabr", "ноябр"], ["dekabr", "декабр"],
  ["yanvar", "январ"], ["fevral", "феврал"], ["aprel", "апрел"], ["iyul", "июл"], ["iyun", "июн"], ["avgust", "август"],
  ["raschyotka", "расчётка"], ["progul", "прогул"], ["kalendar", "календар"], ["shtat", "штат"],
  ["direktor", "директор"], ["avans", "аванс"], ["bank", "банк"], ["pasport", "паспорт"],
  ["mln", "млн"], ["mchj", "МЧЖ"]
];

const MAP = {
  a:"а", b:"б", d:"д", e:"е", f:"ф", g:"г", h:"ҳ", i:"и", j:"ж", k:"к", l:"л", m:"м", n:"н",
  o:"о", p:"п", q:"қ", r:"р", s:"с", t:"т", u:"у", v:"в", x:"х", y:"й", z:"з", c:"с", w:"в"
};
const DIGRAPH = [
  [new RegExp("o" + APOS, "g"), "ў"], [new RegExp("g" + APOS, "g"), "ғ"],
  [/sh/g, "ш"], [/ch/g, "ч"], [/yo/g, "ё"], [/yu/g, "ю"], [/ya/g, "я"], [/ye/g, "е"],
  [/tsiya/g, "ция"], [/tsion/g, "цион"]
];
const VOWELS = "aeiouаеиоуўэёюя";

function lowerWord(w){
  for (const [lat, cyr] of LOAN) if (w.startsWith(lat)) return cyr + convert(w.slice(lat.length), true);
  return convert(w, false);
}
function convert(w, afterLoan){
  let out = w;
  for (const [re, to] of DIGRAPH) out = out.replace(re, to);
  // so‘z boshida yoki unlidan keyin "e" → "э"
  out = out.replace(/e/g, (m, i) => (!afterLoan && i === 0) || (i > 0 && VOWELS.includes(out[i - 1])) ? "э" : "е");
  out = out.replace(new RegExp(APOS, "g"), "ъ");
  return [...out].map(ch => MAP[ch] ?? ch).join("");
}

// Bitta so‘zni (harf va tutuq belgilari ketma-ketligi) o‘girish; bosh harflarni saqlash
function word(w){
  const lower = w.toLowerCase();
  let cyr = lowerWord(lower);
  if (w === w.toUpperCase() && /[A-Z]/.test(w) && w.length > 1) return cyr.toUpperCase();
  if (/^[A-Z]/.test(w)) return cyr.charAt(0).toUpperCase() + cyr.slice(1);
  return cyr;
}

const WORD = new RegExp(`[A-Za-z](?:[A-Za-z]|${APOS}(?=[A-Za-z]))*`, "g");
export function toCyrillic(text){
  return String(text ?? "")
    .split(/(https?:\/\/\S+|HuquqYo‘l)/)  // havolalar va brend nomi o‘zgarmaydi
    .map((part, i) => i % 2 ? part : part.replace(WORD, word).replace(/«([^»]*)»/g, "«$1»"))
    .join("");
}

// Hujjat modelidagi barcha matnlarni o‘girish
export function cyrillicModel(model){
  const tp = p => p.v != null ? { v: toCyrillic(p.v) } : { ...p, ph: toCyrillic(p.ph) };
  return {
    ...model,
    blocks: model.blocks.map(b => ({
      ...b,
      ...(b.text != null ? { text: toCyrillic(b.text) } : {}),
      ...(b.left != null ? { left: toCyrillic(b.left) } : {}),
      ...(b.parts ? { parts: b.parts.map(tp) } : {}),
      ...(b.lines ? { lines: b.lines.map(l => l.map(tp)) } : {}),
      ...(b.items ? { items: b.items.map(l => l.map(tp)) } : {}),
      ...(b.right ? { right: b.right.map(tp) } : {})
    })),
    missing: (model.missing || []).map(m => typeof m === "string" ? toCyrillic(m) : { ...m, label: toCyrillic(m.label) })
  };
}
