import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const load = f => JSON.parse(readFileSync(join(here, "kb", f), "utf8"));
const dict = (arr, key = "id") => Object.assign(Object.create(null), Object.fromEntries(arr.map(x => [x[key], x])));  // prototipsiz lug‘at

export const LAWS = Object.assign(Object.create(null), load("laws.json"));
export const DOMAINS = load("domains.json");
export const NORMS = load("norms.json").map(n => ({ ...n, lawName: LAWS[n.law]?.name, lawUrl: LAWS[n.law]?.url }));
export const SCENARIOS = load("scenarios.json");
export const APPLICANT_FIELDS = load("applicant.json");
export const NORM_BY_ID = dict(NORMS);
export const SCENARIO_BY_ID = dict(SCENARIOS);
export const LEX_URL = "https://lex.uz";

// Holatning barcha maydonlari: ariza beruvchi + holatga xos + qo‘shimcha matn
const EXTRA = { k:"extra", label:"Qo‘shimcha holatlar", ph:"qo‘shimcha", type:"textarea" };
export const fieldsOf = s => [...APPLICANT_FIELDS, ...s.fields, EXTRA];
export const fieldMap = s => dict(fieldsOf(s), "k");
