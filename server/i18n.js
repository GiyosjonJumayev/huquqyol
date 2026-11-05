// Server tomonidagi til: so‘rov tilini aniqlash, server xabarlari va kirill yozuviga o‘girish.
// Tillar: uz (lotin), cyr (o‘zbek kirill — lotindan avtomatik), ru (rus).
import { toCyrillic } from "../public/translit.js";
import { LANGS } from "../public/i18n.js";

export const LANG_COOKIE = "hy_lang";
// Eski mijozlar "lat" yuboradi
export const parseLang = v => v === "lat" ? "uz" : LANGS.includes(v) ? v : null;

function fromCookie(header){
  const m = /(?:^|;\s*)hy_lang=([a-z]{2,3})/.exec(header || "");
  return m ? parseLang(m[1]) : null;
}
function fromAccept(header){
  for (const part of String(header || "").toLowerCase().split(",")){
    const tag = part.trim().split(";")[0];
    if (tag.startsWith("ru")) return "ru";
    if (tag === "uz-cyrl" || tag.startsWith("uz-cyrl")) return "cyr";
    if (tag.startsWith("uz")) return "uz";
  }
  return null;
}
// Ustuvorlik: so‘rov tanasi → ?lang= → cookie → brauzer tili → o‘zbek
export const resolveLang = req =>
  parseLang(req.body?.lang) || parseLang(req.query?.lang) || fromCookie(req.headers.cookie) || fromAccept(req.headers["accept-language"]) || "uz";

const M = {
  scenario:{ uz:"Noma’lum holat.", ru:"Неизвестная ситуация." },
  date:{ uz:"{label} noto‘g‘ri (YYYY-MM-DD).", ru:"{label}: неверный формат (ГГГГ-ММ-ДД)." },
  future:{ uz:"{label} kelajakda bo‘lishi mumkin emas.", ru:"{label}: не может быть в будущем." },
  old:{ uz:"{label} juda eski.", ru:"{label}: слишком давно." },
  num:{ uz:"{label} noto‘g‘ri.", ru:"{label}: неверное значение." },
  option:{ uz:"{label}: noma’lum variant.", ru:"{label}: неизвестный вариант." },
  phone:{ uz:"Telefon raqami noto‘g‘ri.", ru:"Неверный номер телефона." },
  short:{ uz:"Vaziyatni bir-ikki gap bilan yozing.", ru:"Опишите ситуацию в одном-двух предложениях." },
  long:{ uz:"Matn juda uzun (4000 belgigacha).", ru:"Текст слишком длинный (до 4000 символов)." },
  dateLabel:{ uz:"Sana", ru:"Дата" },
  json415:{ uz:"So‘rov JSON formatida bo‘lishi kerak.", ru:"Запрос должен быть в формате JSON." },
  rate:{ uz:"So‘rovlar juda ko‘p. Bir daqiqadan keyin urinib ko‘ring.", ru:"Слишком много запросов. Попробуйте через минуту." },
  tooLarge:{ uz:"So‘rov juda katta.", ru:"Запрос слишком большой." },
  badJson:{ uz:"JSON noto‘g‘ri.", ru:"Неверный JSON." },
  notFound:{ uz:"Topilmadi.", ru:"Не найдено." },
  format:{ uz:"Format: docx yoki pdf.", ru:"Формат: docx или pdf." },
  server:{ uz:"Serverda xatolik yuz berdi.", ru:"На сервере произошла ошибка." },
  origin:{ uz:"So‘rov boshqa saytdan yuborilgan.", ru:"Запрос отправлен с другого сайта." }
};
export function msg(lang, key, vars = {}){
  const m = M[key]; if (!m) return key;
  const s = m[lang === "ru" ? "ru" : "uz"].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  return lang === "cyr" ? toCyrillic(s) : s;
}

// Javobdagi barcha matnlarni kirillga o‘girish. Identifikator, URL va texnik kalitlar o‘zgarmaydi.
const KEEP = new Set(["id","k","v","type","domain","law","scenario","recipient","level","calc","url","lawUrl","lex","source","model",
  "partyField","amountField","fallbackReason","lang","fmt"]);
const SKIP_TREE = new Set(["retrieval", "keywords", "raw", "form"]);
export function deepCyr(x, key){
  if (typeof x === "string") return KEEP.has(key) ? x : toCyrillic(x);
  if (Array.isArray(x)) return x.map(v => deepCyr(v, key));
  if (x && typeof x === "object"){
    const r = {};
    for (const [k, v] of Object.entries(x)) r[k] = SKIP_TREE.has(k) ? v : deepCyr(v, k);
    return r;
  }
  return x;
}
