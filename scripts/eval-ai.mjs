// AI tahlilini baholash: testlardagi namuna matnlar (uz, kirill, ru) analyze() orqali AI bilan va AI’siz.
// npm test ga kirmaydi. Kalit va natijalar faylga yozilmaydi — faqat ekranga.
//
//   node scripts/eval-ai.mjs                       # .env dagi provayder (AI_PROVIDER / kalitlar)
//   node scripts/eval-ai.mjs --delay=4000          # bepul tarifda daqiqalik limitga tushmaslik uchun so‘rovlar orasida pauza (ms)
//   node scripts/eval-ai.mjs --only=ru --limit=10  # faqat bitta til / birinchi N ta matn
//   node scripts/eval-ai.mjs --verbose             # har bir matn bo‘yicha natija
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
try { process.loadEnvFile(root + ".env"); } catch {}          // .env (bo‘lsa); hosting o‘zgaruvchilari ustun
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split("=")[1] : d; };
const DELAY = Number(arg("delay", 0)), LIMIT = Number(arg("limit", 0)), ONLY = arg("only", ""), VERBOSE = process.argv.includes("--verbose");

const { analyze, aiProvider, aiModel, aiClient, _setClient, _setGemini } = await import("../server/analyze.js");
const { toCyrillic } = await import("../public/translit.js");
const { examples } = await import("../public/shared.js");
const { SCENARIO_BY_ID } = await import("../server/kb.js");

// 1) Namunalar testlardan olinadi (nusxa emas): "matn": "holat_id" juftliklari
const pairs = [];
for (const f of ["test/domains.test.js", "test/core.test.js"]){
  const src = readFileSync(root + f, "utf8");
  for (const m of src.matchAll(/^\s*"([^"\n]{8,200})"\s*:\s*"([a-z_]+)",?\s*(?:\/\/.*)?$/gm))
    if (SCENARIO_BY_ID[m[2]] || m[2] === "boshqa") pairs.push([m[1], m[2]]);
}
pairs.push(["Patent olish uchun qanday hujjatlar kerak", "boshqa"]);              // core.test.js: doiradan tashqari
const isCyr = t => /[Ѐ-ӿ]/.test(t);
const cases = [], seen = new Set();
const add = (text, expected, lang) => { if (!seen.has(text)){ seen.add(text); cases.push({ text, expected, lang }); } };
for (const [t, id] of pairs) add(t, id, isCyr(t) ? "ru" : "uz");
for (const [t, id] of pairs) if (!isCyr(t)) add(toCyrillic(t), id, "cyr");      // o‘zbek kirill — lotin namunalardan
for (const l of ["uz", "cyr", "ru"]) add(examples(l)[2], "murojaat_umumiy", l);  // bosh sahifa namunasi (appeal.test.js)
let list = ONLY ? cases.filter(c => c.lang === ONLY) : cases;
if (LIMIT) list = list.slice(0, LIMIT);

// 2) Rejimlar: AI o‘chiq (qoidalar) va AI yoqilgan (.env dagi provayder)
const provider = aiProvider(), model = provider ? aiModel() : null;
const restore = provider === "gemini" ? (k => () => _setGemini(k))(process.env.GEMINI_API_KEY.trim()) : (c => () => _setClient(c))(aiClient());
const off = () => provider === "gemini" ? _setGemini(null) : _setClient(null);

// AI xatolari sababi (status) — analyze() logidan; matn va kalit logga yozilmaydi
const reasons = {};
const warn = console.warn;
console.warn = (...a) => { const s = a.map(String).join(" "); if (s.startsWith("[analyze]")) { const k = a.at(-1); reasons[k] = (reasons[k] || 0) + 1; } else warn(...a); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run(mode){
  const out = [];
  for (const [i, c] of list.entries()){
    if (mode === "ai" && DELAY && i) await sleep(DELAY);
    const t0 = performance.now();
    let r;
    try { r = await analyze(c.text, c.lang === "ru" ? "ru" : "uz"); } catch (e) { r = { scenario: "ERROR", source: "error" }; }
    const ms = Math.round(performance.now() - t0);
    out.push({ ...c, got: r.scenario, source: r.source, ms });
    if (VERBOSE) console.log(`  [${mode}] ${r.scenario === c.expected ? "✓" : "✗"} ${String(ms).padStart(5)} ms ${c.lang} ${r.source.padEnd(5)} ${c.expected} → ${r.scenario} · ${c.text}`);
    else process.stdout.write(".");
  }
  if (!VERBOSE) process.stdout.write("\n");
  return out;
}
const stats = (rows, label) => {
  const ok = rows.filter(r => r.got === r.expected).length, ms = rows.map(r => r.ms);
  const byLang = ["uz", "cyr", "ru"].map(l => { const x = rows.filter(r => r.lang === l); return x.length ? `${l} ${x.filter(r => r.got === r.expected).length}/${x.length}` : null; }).filter(Boolean).join(" · ");
  console.log(`${label.padEnd(26)} aniqlik ${(100 * ok / rows.length).toFixed(1)}% (${ok}/${rows.length})  [${byLang}]  o‘rtacha ${Math.round(ms.reduce((a, b) => a + b, 0) / ms.length)} ms, eng ko‘p ${Math.max(...ms)} ms`);
};

console.log(`Namunalar: ${list.length} ta (uz ${list.filter(c => c.lang === "uz").length}, kirill ${list.filter(c => c.lang === "cyr").length}, ru ${list.filter(c => c.lang === "ru").length})`);
console.log(`AI provayder: ${provider ? `${provider} (${model})` : "yo‘q — faqat qoidalar rejimi baholanadi"}\n`);

off();
console.log("AI o‘chiq (qoidalar):"); const rules = await run("rules");
let ai = null;
if (provider){
  restore();
  console.log(`AI yoqilgan (${provider}):`); ai = await run("ai");
}
console.warn = warn;

console.log("\n=== Natija ===");
stats(rules, "AI o‘chiq (qoidalar)");
if (ai){
  stats(ai, `AI (${provider})`);
  const fb = ai.filter(r => r.source !== "ai");
  if (fb.length) console.log(`  AI javob bermay qoidalarga o‘tgan: ${fb.length} ta — sabablar: ${Object.entries(reasons).map(([k, v]) => `${k}×${v}`).join(", ")}${reasons["429"] ? "  (429 — limit: --delay=4000 bilan qayta urinib ko‘ring)" : ""}`);
  const okAi = ai.filter(r => r.source === "ai");
  if (okAi.length && fb.length) stats(okAi, "  faqat AI javob berganlar");
  const diff = ai.map((r, i) => ({ ...r, rules: rules[i].got })).filter(r => r.got !== r.rules);
  console.log(`\nRejimlar farq qilgan holatlar: ${diff.length} ta`);
  for (const d of diff) console.log(`  ${d.lang.padEnd(3)} kutilgan ${d.expected.padEnd(18)} qoidalar ${(d.rules === d.expected ? "✓ " : "✗ ") + d.rules.padEnd(18)} AI ${(d.got === d.expected ? "✓ " : "✗ ") + d.got.padEnd(18)} ${d.source !== "ai" ? "(AI xato → qoidalar) " : ""}· ${d.text}`);
} else {
  const bad = rules.filter(r => r.got !== r.expected);
  if (bad.length){ console.log("\nQoidalar xato qilgan holatlar:"); for (const b of bad) console.log(`  ${b.lang} kutilgan ${b.expected} → ${b.got} · ${b.text}`); }
}
