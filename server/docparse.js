// OCR matnidan hujjat faktlarini qoidalar bilan ajratish (AI kerak emas).
// OCR xato qiladi: «№» → «Ne», «so‘m» → «5071.», «01 A» → «OLA», lotin «AB» → kirill «АВ».
// Shuning uchun har bir qoida xatoga chidamli yoziladi va har bir fakt alohida tekshiriladi.
// Natija AI javobi bilan bir xil shaklda: cleanDoc() ga beriladi (server/photo.js).
import { toISO, startOfDay } from "./dates.js";
import { toLatin } from "./text.js";

const APOS = /[ʻʼ'`’‘´]/g;
// Kirill va lotinda bir xil ko‘rinadigan harflar (raqam va avtomobil raqamlarini tiklash uchun)
const CYR_LOOK = { А:"A", В:"B", С:"C", Е:"E", Н:"H", К:"K", М:"M", О:"O", Р:"P", Т:"T", Х:"X", У:"Y" };
const toLatinLook = s => s.replace(/[АВСЕНКМОРТХУ]/g, c => CYR_LOOK[c]);

const MONTHS = {
  yanvar:1, fevral:2, mart:3, aprel:4, may:5, iyun:6, iyul:7, avgust:8, sentabr:9, sentyabr:9, oktabr:10, oktyabr:10, noyabr:11, dekabr:12,
  январ:1, феврал:2, март:3, апрел:4, мая:5, май:5, июн:6, июл:7, август:8, сентябр:9, октябр:10, ноябр:11, декабр:12
};

// Sinov uchun «bugun»ni berish mumkin
function validDate(y, m, d, today){
  if (y < 100) y += 2000;
  const r = new Date(y, m - 1, d);
  if (r.getFullYear() !== y || r.getMonth() !== m - 1 || r.getDate() !== d) return null;
  if (r > startOfDay(today) || r < new Date(1990, 0, 1)) return null;
  return toISO(r);
}

export function findDates(text, today = new Date()){
  const out = [];
  const push = (iso, index) => { if (iso) out.push({ iso, index }); };
  let m;
  const num = /(?<!\d)(\d{1,2})\s?[./-]\s?(\d{1,2})\s?[./-]\s?(\d{4}|\d{2})(?!\d)/g;
  while ((m = num.exec(text))) push(validDate(+m[3], +m[2], +m[1], today), m.index);
  const iso = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g;
  while ((m = iso.exec(text))) push(validDate(+m[1], +m[2], +m[3], today), m.index);
  const word = /(?<!\d)(\d{1,2})[\s-]*(?:[-‐]?\s*)([a-zа-яё‘]{3,9})\w*\.?\s+(\d{4})/giu;
  while ((m = word.exec(text))){
    const key = Object.keys(MONTHS).find(k => m[2].toLowerCase().replace(APOS, "‘").startsWith(k));
    if (key) push(validDate(+m[3], MONTHS[key], +m[1], today), m.index);
  }
  return out.sort((a, b) => a.index - b.index);
}

const lineAt = (text, i) => { const s = text.lastIndexOf("\n", i) + 1, e = text.indexOf("\n", i); return text.slice(s, e < 0 ? undefined : e); };

// Hujjat sanasi: «Sana / Дата / sanasi» yonidagisi; tug‘ilgan sana tashlanadi; bo‘lmasa birinchi sana
export function pickDate(text, today = new Date()){
  const ds = findDates(text, today).filter(d => !/tug‘il|tugil|рожд|туғил/i.test(lineAt(text, d.index).replace(APOS, "‘")));
  const labeled = ds.find(d => /sana|дата|сана|от\s|date|vaqt/i.test(lineAt(text, d.index)));
  return (labeled || ds[0])?.iso || null;
}

// Summa: minglik guruhli son; «so‘m / сум / jarima / штраф / JAMI / итого» yonida bo‘lsa ustun
const CUR = /so[‘`'ʻ’]?m|сум|сўм|сӯм|soʻm|\bsum\b|uzs/i;
const MONEY_KW = /jarima|штраф|jami|итого|всего|summa|сумма|miqdor|размер|to‘lov|оплат|yechildi|списан|hisob|qarz|долг|narx|цена|baho/i;
export function pickAmount(text){
  const lines = text.split("\n");
  let best = null;
  lines.forEach((ln, i) => {
    if (/stir|инн|inn|tel|тел|\+998|hisob raqami|р\/с|mfo|мфо|karta\s*№|qqs|ндс/i.test(ln)) return;   // soliq, telefon, hisob raqamlari summa emas
    const near = ln + " " + (lines[i + 1] || "");
    const re = /(?<![\d.,])(\d{1,3}(?:[  .,]\d{3})+|\d{4,9})(?:[.,]\d{2})?(?![\d])/g;
    let m;
    while ((m = re.exec(ln))){
      const raw = m[1], n = Number(raw.replace(/[  .,]/g, ""));
      if (!(n >= 1000 && n < 1e11)) continue;
      if (/^(19|20)\d{2}$/.test(raw)) continue;                              // yil
      const after = ln.slice(m.index + m[0].length, m.index + m[0].length + 40);
      if (/^\s*(-?yil|г\.|yil|km|кг|kg|%)/i.test(after)) continue;
      const grouped = /[  .,]/.test(raw);
      let score = (grouped ? 2 : 0) + (CUR.test(after) || CUR.test(ln) ? 3 : 0) + (MONEY_KW.test(near) ? 2 : 0) + (/jami|итого|всего/i.test(ln) ? 2 : 0);
      if (/ming|тысяч|минг/i.test(after)) score += 1;
      if (!grouped && score < 3) continue;
      if (!best || score > best.score || (score === best.score && n > best.n)) best = { n, score };
    }
  });
  return best?.n ?? null;
}

// Hujjat raqami: «№ / Ne / No / N° / WN:» dan keyin
export function pickNumber(text, latinDoc = true){
  const m = /(?:№|N[eoº°]\.?|WN:?|Nr\.?|raqami?\s*:)\s*:?\s*([A-ZА-ЯЁ]{0,3}[\s-]?\d{2,12}(?:[/-][\dA-Za-zА-Яа-яЁё]{1,6})?)(?![\w‘])/u.exec(text);
  if (!m) return null;
  let v = m[1].replace(/\s+/g, " ").trim();
  if (latinDoc && /^[АВСЕНКМОРТХУ\s\d/-]+$/.test(v)) v = toLatinLook(v);
  return v;
}

// O‘zbekiston avtomobil raqami: «01 A 123 BC» (jismoniy) yoki «01 123 ABC» (yuridik); OCR xatolari tuzatiladi
export function pickPlate(text){
  const t = toLatinLook(text.toUpperCase()).replace(/\$/g, "S").replace(/€/g, "E");          // OCR: «S» → «$»
  const fixRegion = r => r.replace(/[OQD]/g, "0").replace(/[LI|]/g, "1").replace(/S/g, "5").replace(/Z/g, "2").replace(/B/g, "8");
  const region = "([0-9OQDLI|SZ]{2})";
  let m = new RegExp(`(?<![A-Z0-9])${region}\\s?([A-Z])\\s?(\\d{3})\\s?([A-Z]{2})(?![A-Z0-9])`).exec(t)
       || new RegExp(`(?<![A-Z0-9])${region}([A-Z])\\s(\\d{3})\\s?([A-Z]{2})(?![A-Z0-9])`).exec(t);
  if (m){ const r = fixRegion(m[1]); if (/^\d{2}$/.test(r) && +r >= 1 && +r <= 95) return `${r} ${m[2]} ${m[3]} ${m[4]}`; }
  m = new RegExp(`(?<![A-Z0-9])${region}\\s?(\\d{3})\\s?([A-Z]{3})(?![A-Z0-9])`).exec(t);
  if (m){ const r = fixRegion(m[1]); if (/^\d{2}$/.test(r) && +r >= 1 && +r <= 95) return `${r} ${m[2]} ${m[3]}`; }
  return null;
}

// Hujjatni chiqargan tashkilot: eng aniq tashkilot nomi bo‘lgan qator
const ORG = [
  [/boshqarma|bo‘lim|bo‘limi|inspeksiya|inspeksiyasi|yhxx|yo‘l harakati|iib|iibb|hokimlig|agentlig|qo‘mita|markaz|jamg‘arma|sudi\b/i, 3],
  [/mchj|\bmas['‘]?uliyati\b|\bak\b|\baj\b|\bxk\b|\bqk\b|\byatt\b|bank|«[^»]{2,40}»/i, 3],
  [/управлени|отдел|инспекци|гувд|увд|гаи|дпс|хокимият|агентств|комитет|фонд|суд\b|банк|ооо|\bао\b|\bип\b/i, 3],
  [/vazirlig|министерств|respublikasi|республики/i, 1]
];
const NOT_ORG = /fuqaro|гражданин|водител|haydovchi|inspektor:|инспектор:|imzo|подпись|manzil:|адрес:|qaror qildi|постановил|tug‘il|рожд/i;
export function pickIssuer(text){
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let best = null;
  lines.slice(0, 25).forEach((ln, i) => {
    const l = ln.replace(APOS, "‘");
    if (NOT_ORG.test(l) || l.length < 4 || l.length > 160) return;
    const score = ORG.reduce((s, [re, w]) => s + (re.test(l) ? w : 0), 0) - i * 0.05;
    if (score > 0 && (!best || score > best.score)) best = { score, i, ln };
  });
  if (!best) return null;
  let v = best.ln;
  const next = lines[best.i + 1];
  // «Управление ... движения» + «ГУВД ... области» kabi ikki qatorli nom
  if (next && !NOT_ORG.test(next) && next.length < 80 && ORG.slice(0, 3).some(([re]) => re.test(next.replace(APOS, "‘"))) && !/№|qaror|постановлен|chek|чек/i.test(next)) v += " " + next;
  return v.replace(/\s+/g, " ").replace(/[,;:.\s]+$/, "").slice(0, 160);
}

// Hujjat turi: kalit so‘zlar bo‘yicha (o‘zbek lotin/kirill va rus)
const TYPES = [
  ["yhxx_qarori", t => /(qaror|постановлен|қарор)/.test(t) && /(yhxx|yo‘l harakati|йҳхх|йўл ҳаракати|дпс|гаи|дорожного движения|davlat raqami|госномер|transport vositasi|транспортн)/.test(t)],
  ["jarima_qarori", t => /(qaror|постановлен|қарор)/.test(t) && /(jarima|штраф|жарима|ma’muriy|ma'muriy|административн|маъмурий)/.test(t)],
  ["sud_qarori", t => /(hal qiluv qarori|sud qarori|решение суда|именем республики|ҳал қилув)/.test(t)],
  ["ish_buyrugi", t => /(buyruq|приказ|буйруқ)/.test(t)],
  ["bank_xabarnoma", t => /(bank|банк)/.test(t) && /(karta|карт|tranzaksiya|транзакц|списан|yechil|o‘tkazma|перевод|operatsiya|операци)/.test(t)],
  ["kommunal_hisob", t => /(kvitansiya|квитанц|hisobvaraq|счет|счёт|kvt|квт|elektr|электр|gaz|газ|ichimlik suvi|водоснабж|kommunal|коммунал)/.test(t)],
  ["chek", t => /(chek|чек|kassa|касса|jami|итого|qqs|ндс|xarid|покупк)/.test(t)],
  ["shartnoma", t => /(shartnoma|договор|шартнома)/.test(t)],
  ["murojaat_javobi", t => /(murojaat|обращени|мурожаат)/.test(t) && /(javob|ответ|жавоб)/.test(t)],
  ["organ_qarori", t => /(qaror|решени|постановлен|қарор)/.test(t)]
];
export function pickType(text){
  const t = text.toLowerCase().replace(APOS, "‘");
  return TYPES.find(([, f]) => f(t))?.[0] || "boshqa";
}

// Hujjat sarlavhasi: katta harfli, kalit so‘zli birinchi qator
export function pickTitle(text){
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 20);
  const ln = lines.find(l => /(qaror|постановлени|решени|buyruq|приказ|chek|чек|kvitansiya|квитанц|shartnoma|договор|xabarnoma|уведомлен|bildirishnoma)/i.test(l) && l.length < 90 && l === l.toUpperCase());
  return ln ? ln.replace(/(№|N[eoº°]|WN:?).*$/u, "").replace(/\s+/g, " ").trim().replace(/[,:;\s]+$/, "") || null : null;
}

// Jarima/qaror sababi: «uchun / за / asosan» bilan tugaydigan qisqa bo‘lak
export function pickReason(text){
  const flat = text.replace(/\n+/g, " ").replace(/\s+/g, " ");
  // «... oshirgani uchun» — bandning boshi oldingi verguldan; «rahmat uchun» kabi iboralar emas
  const kw = /\s(uchun|учун)(?!\s+rahmat|\s+раҳмат)\b/iu.exec(flat);
  if (kw){
    const start = Math.max(flat.lastIndexOf(",", kw.index), flat.lastIndexOf(".", kw.index), flat.lastIndexOf(":", kw.index), kw.index - 160) + 1;
    const clause = flat.slice(start, kw.index + kw[0].length).trim();
    if (clause.split(" ").length >= 3) return clause.slice(0, 300);
  }
  const ru = /((?:за\s+нарушение|нарушил[аи]?|за\s+превышение|за\s+несоблюдение)[^.]{8,200})/iu.exec(flat);
  return ru ? ru[1].trim().slice(0, 300) : null;
}

const SITUATION = {
  yhxx_qarori: "YHXX yo‘l harakati jarima qarori oldim, jarimaga rozi emasman, shikoyat qilmoqchiman.",
  jarima_qarori: "Menga ma’muriy jarima solindi, jarima qaroriga shikoyat qilmoqchiman.",
  ish_buyrugi: "Ish beruvchining buyrug‘i bilan rozi emasman.",
  chek: "Do‘kondan tovar sotib oldim, tovar sifatsiz chiqdi, sotuvchi almashtirmayapti.",
  bank_xabarnoma: "Bank kartamdan ruxsatsiz pul yechib olindi.",
  kommunal_hisob: "Kommunal xizmat uchun noto‘g‘ri, ortiqcha hisob keldi.",
  shartnoma: "Shartnoma bo‘yicha tomon majburiyatini bajarmayapti.",
  sud_qarori: "Sud qarori bilan rozi emasman.",
  murojaat_javobi: "Davlat idorasiga murojaat qildim, javob qoniqarsiz.",
  organ_qarori: "Davlat organining qaroriga rozi emasman, shikoyat qilmoqchiman.",
  boshqa: ""
};

// Lotin yozuvli qatorda adashib chiqqan kirill so‘zlari (OCR: «IIBB» → «ПВВ», «AB» → «АВ») lotinga qaytariladi.
// Kirill qatorlarga tegilmaydi: rus va o‘zbek kirill hujjatlari o‘z holicha qoladi.
const MIS = { П:"II", п:"n", И:"N", и:"u", Л:"J", л:"n", Ш:"III", ш:"w", Ц:"U", Д:"D", д:"d", Г:"r", г:"r", Ь:"b", Ы:"bI", Я:"R", Ф:"F" };
export function fixMixedScript(text){
  return String(text).split("\n").map(line => {
    const cyr = (line.match(/[Ѐ-ӿ]/g) || []).length, lat = (line.match(/[A-Za-z]/g) || []).length;
    if (!cyr || lat < cyr * 3) return line;
    return line.replace(/[Ѐ-ӿ][Ѐ-ӿ\d]*/g, w => toLatin(toLatinLook(w).replace(/[Ѐ-ӿ]/g, c => MIS[c] ?? c)));
  }).join("\n");
}

// Asosiy funksiya: OCR matni → AI javobi bilan bir xil shakldagi obyekt
export function parseDocText(text, today = new Date()){
  const raw = fixMixedScript(String(text ?? "").replace(/\r/g, "").replace(/[ \t]+/g, " "));
  const cyr = (raw.match(/[Ѐ-ӿ]/g) || []).length, lat = (raw.match(/[A-Za-z]/g) || []).length;
  const latinDoc = lat >= cyr;
  const docType = pickType(raw);
  const amount = pickAmount(raw);
  // Ish beruvchi buyrug‘i: bo‘shatish yoki ta’til ekanini aniqlash (holat tanlash uchun)
  const low = raw.toLowerCase().replace(APOS, "‘");
  let situation = SITUATION[docType];
  if (docType === "ish_buyrugi" && /(bo‘shat|ishdan ozod|увольн|расторж|бўшат)/.test(low)) situation = "Ish beruvchi buyruq bilan meni ishdan noqonuniy bo‘shatdi.";
  else if (docType === "ish_buyrugi" && /(ta’til|tatil|отпуск|таътил)/.test(low)) situation = "Ish beruvchi menga ta’til bermadi.";
  return {
    readable: raw.replace(/\s/g, "").length >= 20,
    doc_type: docType,
    title: pickTitle(raw),
    issuer: pickIssuer(raw),
    number: pickNumber(raw, latinDoc),
    date: pickDate(raw, today),
    amount_som: amount,
    plate: pickPlate(raw),
    reason: pickReason(raw),
    situation,
    script: latinDoc ? "latin" : "cyrillic",
    text: raw,
    searchText: latinDoc ? raw : `${raw} ${toLatin(raw)}`
  };
}
