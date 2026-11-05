import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const load = f => JSON.parse(readFileSync(join(here, "kb", f), "utf8"));
const dict = (arr, key = "id") => Object.assign(Object.create(null), Object.fromEntries(arr.map(x => [x[key], x])));  // prototipsiz lug‘at
export const LEX_URL = "https://lex.uz";

// Tarjimani asosiy bazaga qo‘yish: obyektlar kalit bo‘yicha, obyektlar ro‘yxati indeks bo‘yicha birlashadi,
// matnlar ro‘yxati esa butunlay almashtiriladi. Tarjimada yo‘q kalitlar (id, k, type, muddat…) asosiydan qoladi.
function overlay(base, over){
  if (over === undefined) return base;
  if (Array.isArray(base) && Array.isArray(over)) return base.some(x => x && typeof x === "object") ? base.map((b, i) => overlay(b, over[i])) : over;
  if (base && typeof base === "object" && over && typeof over === "object"){
    const r = { ...base };
    for (const k of Object.keys(over)) r[k] = overlay(base[k], over[k]);
    return r;
  }
  return over;
}
const ruArticle = a => a && a.replace(/^(\S+)-modda$/, "Статья $1").replace(/^(\S+)-bob$/, "Глава $1");

function build(lang){
  const tr = lang === "ru" ? load("ru.json") : null;
  const LAWS = Object.assign(Object.create(null), tr ? overlay(load("laws.json"), tr.laws) : load("laws.json"));
  const DOMAINS = load("domains.json").map(d => overlay(d, tr?.domains[d.id]));
  const NORMS = load("norms.json").map(n => {
    const x = tr ? { ...overlay(n, tr.norms[n.id]), article: ruArticle(n.article) } : n;
    return { ...x, lawName: LAWS[n.law]?.name, lawUrl: LAWS[n.law]?.url };
  });
  const SCENARIOS = load("scenarios.json").map(s => overlay(s, tr?.scenarios[s.id]));
  const APPLICANT_FIELDS = overlay(load("applicant.json"), tr?.applicant);
  const EXTRA = overlay({ k:"extra", label:"Qo‘shimcha holatlar", ph:"qo‘shimcha", type:"textarea" }, tr?.extra);
  const fieldsOf = s => [...APPLICANT_FIELDS, ...s.fields, EXTRA];
  return {
    lang, LAWS, DOMAINS, NORMS, SCENARIOS, APPLICANT_FIELDS,
    NORM_BY_ID: dict(NORMS), SCENARIO_BY_ID: dict(SCENARIOS),
    fieldsOf, fieldMap: s => dict(fieldsOf(s), "k")
  };
}

// uz — asosiy baza (kirill yozuvi chiqishda lotindan o‘giriladi), ru — tarjima
const KB = { uz: build("uz"), ru: build("ru") };
export const kbFor = lang => lang === "ru" ? KB.ru : KB.uz;

// Asosiy (o‘zbekcha) baza — qidiruv, tekshiruv va testlar uchun
export const { LAWS, DOMAINS, NORMS, SCENARIOS, APPLICANT_FIELDS, NORM_BY_ID, SCENARIO_BY_ID, fieldsOf, fieldMap } = KB.uz;
