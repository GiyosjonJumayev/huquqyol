import Anthropic from "@anthropic-ai/sdk";
import { SCENARIOS, SCENARIO_BY_ID } from "./kb.js";
import { retrieve } from "./rag.js";
import { extractFacts } from "./facts.js";
import { parseISO, toISO, startOfDay } from "./dates.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
let client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
export const aiEnabled = () => !!client;
export const _setClient = c => { client = c; }; // testlar uchun

function ruleAnalyze(text, ctx){
  const top = ctx.ranked[0];
  const facts = extractFacts(text);
  if (!top || (top.keywordHits === 0 && top.score < 3)) return { scenario:"boshqa", confidence:0.2, summary:"", facts, missing:[], normIds:[] };
  const tie = ctx.ranked[1] && ctx.ranked[1].score >= top.score * 0.9;
  const confidence = Math.min(0.9, 0.4 + 0.12 * top.keywordHits + (tie ? -0.15 : 0.1));
  return { scenario: top.id, confidence: Number(confidence.toFixed(2)), summary:"", facts, missing:[], normIds:[] };
}

const SYSTEM = `Sen O‘zbekiston mehnat huquqi bo‘yicha yordamchisan. Vazifang: fuqaro yozgan vaziyatni tasniflash va arizaga kerak faktlarni ajratish.
Qoidalar:
- Faqat foydalanuvchi xabaridagi BILIM BAZASI normalariga tayan. Bazada yo‘q modda raqamini hech qachon yozma.
- Fuqaroga "siz" deb murojaat qil, o‘zbek lotin yozuvida, qisqa va oddiy tilda yoz.
- Faqat bitta JSON obyekt qaytar, boshqa hech narsa yozma.`;

async function aiAnalyze(text, ctx){
  const kb = ctx.norms.map(n => `[${n.id}] Mehnat kodeksi, ${n.article} «${n.title}»: ${n.text}`).join("\n")
    + (ctx.articles.length ? "\n\nASL MATNDAN PARCHALAR (lex.uz):\n" + ctx.articles.map(a => `${a.article} «${a.title}»: ${a.text}`).join("\n---\n") : "");
  const scen = SCENARIOS.map(s => `- ${s.id}: ${s.title} (${s.card})`).join("\n");
  const user = `Bugungi sana: ${toISO(startOfDay())}.

FUQARO YOZDI:
"""${text.slice(0, 4000)}"""

HOLATLAR:
${scen}
- boshqa: mehnat nizosi emas yoki yuqoridagilarga to‘g‘ri kelmaydi

BILIM BAZASI (qidiruv natijasi):
${kb}

JSON shakli:
{"scenario":"${SCENARIOS.map(s=>s.id).join("|")}|boshqa","confidence":0..1,"summary":"2 gap: vaziyat va fuqaroning asosiy huquqi","employer":"nomi yoki null","position":"lavozim yoki null","amount_som":son yoki null,"months":son yoki null,"event_date":"YYYY-MM-DD yoki null","missing":["arizaga kerak, matnda yo‘q ma’lumot — 3 tagacha"],"norm_ids":["eng tegishli norma id lari"]}`;

  const res = await client.messages.create({
    model: MODEL, max_tokens: 700, system: SYSTEM,
    messages: [{ role:"user", content: user }]
  });
  const out = res.content.filter(c => c.type === "text").map(c => c.text).join("");
  const json = out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1);
  const r = JSON.parse(json);
  if (!(r.scenario in SCENARIO_BY_ID) && r.scenario !== "boshqa") throw new Error("noto‘g‘ri holat: " + r.scenario);

  const facts = extractFacts(text);
  if (r.employer) facts.employer = String(r.employer).slice(0, 80);
  if (r.position) facts.position = String(r.position).slice(0, 60);
  if (Number(r.amount_som) > 0) facts.amount = Math.round(Number(r.amount_som));
  if (Number(r.months) > 0) facts.months = Math.round(Number(r.months));
  if (parseISO(r.event_date)) facts.eventDate = r.event_date;
  const allowed = new Set(ctx.norms.map(n => n.id));
  return {
    scenario: r.scenario,
    confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0.7)),
    summary: typeof r.summary === "string" ? r.summary.slice(0, 600) : "",
    facts,
    missing: Array.isArray(r.missing) ? r.missing.slice(0, 3).map(String) : [],
    normIds: Array.isArray(r.norm_ids) ? r.norm_ids.filter(id => allowed.has(id)) : []   // bazada yo‘q normani tashlab yuborish
  };
}

export async function analyze(text){
  const ctx = retrieve(text);
  const retrieval = { norms: ctx.norms.map(n => ({ id:n.id, article:n.article, score:n.score })), articles: ctx.articles.map(a => ({ article:a.article, title:a.title, score:a.score })), scenarios: ctx.ranked };
  if (client){
    try {
      return { ...(await aiAnalyze(text, ctx)), source:"ai", model: MODEL, retrieval };
    } catch (e) {
      console.warn("[analyze] AI xatosi, qoidalarga o‘tildi:", e.message);
      return { ...ruleAnalyze(text, ctx), source:"rules", fallbackReason: "ai_error", retrieval };
    }
  }
  return { ...ruleAnalyze(text, ctx), source:"rules", retrieval };
}
