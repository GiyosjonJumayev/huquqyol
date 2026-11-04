import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const load = f => JSON.parse(readFileSync(join(here, "kb", f), "utf8"));

export const NORMS = load("norms.json");
export const SCENARIOS = load("scenarios.json");
export const NORM_BY_ID = Object.assign(Object.create(null), Object.fromEntries(NORMS.map(n => [n.id, n])));
export const SCENARIO_BY_ID = Object.assign(Object.create(null), Object.fromEntries(SCENARIOS.map(s => [s.id, s])));
export const LEX_URL = "https://lex.uz/acts/-6257288";
