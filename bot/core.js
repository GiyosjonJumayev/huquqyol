// Bot ekranlari: dvigateldan (server/*) olingan natijani Telegram xabariga aylantirish.
// Bu yerda huquqiy mantiq YO‘Q: muddat, summa, normalar va hujjat matni — analyze/buildPlan/documentModel dan.
import { analyze, aiEnabled } from "../server/analyze.js";
import { buildPlan } from "../server/plan.js";
import { documentModel, toDocx, toPdf } from "../server/documents.js";
import { kbFor } from "../server/kb.js";
import { vAnalyze, vPlan, vDocument } from "../server/validate.js";
import { deepCyr, msg } from "../server/i18n.js";
import { cyrillicModel } from "../public/translit.js";
import { makeT, fmtMoney, fmtDate } from "../public/i18n.js";
import { botT, cyr } from "./i18n.js";
import { buildIcs } from "./ics.js";

export const base = lang => lang === "ru" ? "ru" : "uz";
const out = (lang, x) => lang === "cyr" ? deepCyr(x) : x;
export const esc = s => String(s ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" })[c]);
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthsAgo = (n, now) => { const d = new Date(now); d.setMonth(d.getMonth() - n); return d; };
const btn = (text, data) => ({ text, data });
const scenarioOf = (id, lang) => kbFor(base(lang)).SCENARIO_BY_ID[id];
const title = (id, lang) => { const s = scenarioOf(id, lang); return s ? (lang === "cyr" ? cyr(s.title) : s.title) : id; };

// Sayt bilan bir xil: voqea sanasi → maosh qarzi oylari → qisqa muddatli holatlarda bugun → aks holda bir oy oldin
export function defaultTrigger(s, facts = {}, now = new Date()){
  if (facts.eventDate) return facts.eventDate;
  if (s.id === "ish_haqi" && Number(facts.form?.months) > 0) return iso(monthsAgo(Number(facts.form.months), now));
  return iso(s.deadline?.days || s.deadline?.none ? now : monthsAgo(1, now));
}

// Sayt bilan bir xil qoida: kalit so‘z bilan topilgan va balli yaqin bo‘lgan 2 tagacha holat
export function alternatives(a, chosen){
  if (!a.source || a.source === "choice") return [];
  const ranked = a.retrieval?.scenarios || [], top = ranked.find(r => r.id === chosen)?.score || 0;
  return ranked.filter(r => r.id !== chosen && r.keywordHits > 0 && r.score >= top * (a.confidence < 0.5 ? 0.4 : 0.5)).slice(0, 2).map(r => r.id);
}

// Telegram xabari 4096 belgigacha — qatorlar bo‘yicha bo‘lamiz
export function splitMessage(text, max = 4000){
  const parts = []; let cur = "";
  for (const line of String(text).split("\n")){
    if (line.length > max){ if (cur) { parts.push(cur); cur = ""; } for (let i = 0; i < line.length; i += max) parts.push(line.slice(i, i + max)); continue; }
    if (cur && cur.length + 1 + line.length > max){ parts.push(cur); cur = line; } else cur = cur ? cur + "\n" + line : line;
  }
  if (cur) parts.push(cur);
  return parts;
}

export function startScreen(lang){
  const T = botT(lang);
  const text = [T("start"), "", T("privacy") + (aiEnabled() ? " " + T("privacyAi") : ""), "", T("chooseLang")].join("\n");
  return { text, keyboard: [[btn("O‘zb", "lang:uz"), btn("Ўзб", "lang:cyr"), btn("Рус", "lang:ru")]] };
}

const planFor = (sess, today) => out(sess.lang, buildPlan({ ...vPlan({ scenario: sess.scenario, triggerDate: sess.triggerDate, form: sess.form, lang: base(sess.lang) }), lang: base(sess.lang), today }));

// 2-ekran: tahlil natijasi
export async function analyzeText(sess, text, { today = new Date() } = {}){
  const T = botT(sess.lang);
  let v;
  try { v = vAnalyze({ text, lang: base(sess.lang) }); }
  catch (e) { if (e.key) return { text: msg(sess.lang, e.key, e.vars) }; throw e; }
  const a = await analyze(v.text, base(sess.lang));
  if (a.scenario === "boshqa"){ resetCase(sess); return otherScreen(sess.lang); }
  return chooseScenario(sess, a.scenario, a, { today });
}

export function resetCase(sess){
  delete sess.scenario; delete sess.triggerDate; delete sess.recipient; delete sess.awaiting; delete sess.alts;
  sess.form = {};
}

export function chooseScenario(sess, id, a = { source:"choice", facts:{ form:{} } }, { today = new Date() } = {}){
  const s = scenarioOf(id, sess.lang); if (!s) return otherScreen(sess.lang);
  resetCase(sess);
  sess.scenario = s.id;
  sess.form = { ...(a.facts?.form || {}) };
  sess.triggerDate = defaultTrigger(s, a.facts, today);
  sess.alts = alternatives(a, s.id);
  return summaryScreen(sess, { today });
}

export function summaryScreen(sess, { today = new Date() } = {}){
  const T = botT(sess.lang), p = planFor(sess, today), s = scenarioOf(sess.scenario, sess.lang);
  const lines = [`<b>${esc(T("situation"))}:</b> ${esc(p.info.title)}`];
  const facts = [];
  if (s.amountField && sess.form[s.amountField]) facts.push(`${T("debt")} ${fmtMoney(Number(sess.form[s.amountField]), sess.lang)}`);
  if (sess.form.months) facts.push(T("months", { n: sess.form.months }));
  if (facts.length) lines.push(`${esc(T("fromText"))}: ${esc(facts.join(", "))}`);
  lines.push("", deadlineLine(p, sess.lang));
  lines.push(esc(T("counted", { date: fmtDate(new Date(p.trigger + "T00:00:00"), sess.lang), label: p.info.trigger })));
  const c = p.calc;
  if (c && (c.raw || c.rows)) lines.push("", `${esc(c.title)}: <b>${esc(c.value)}</b>`, ...(c.rows ? c.rows.map(([k, val]) => `• ${esc(k)}: ${esc(val)}`) : []));
  lines.push("", `<i>${esc(T("disclaimer"))}</i>`);
  const keyboard = [[btn(T("bPlan"), "plan"), btn(T("bDoc"), "doc"), btn(T("bCal"), "cal")]];
  if (sess.alts?.length){ lines.push("", esc(T("alts"))); keyboard.push(sess.alts.map(id => btn(title(id, sess.lang), `scn:${id}`))); }
  return { text: lines.join("\n"), keyboard };
}

function deadlineLine(p, lang){
  const T = botT(lang);
  if (!p.deadline) return `<b>${esc(T("noDeadline"))}</b>` + (p.deadlineNote ? `\n${esc(p.deadlineNote)}` : "");
  const last = esc(T("lastDay", { date: p.deadlineText }));
  return p.daysLeft < 0 ? `<b>${esc(T("expiredDays", { n: -p.daysLeft }))}</b> — ${esc(p.risk.tip)}` : `<b>${esc(T("daysLeft", { n: p.daysLeft }))}</b> (${last})`;
}

// 3-ekran: reja
export function planScreen(sess, { today = new Date() } = {}){
  const T = botT(sess.lang), p = planFor(sess, today);
  const lines = [`<b>${esc(T("planTitle"))}: ${esc(p.info.title)}</b>`, ""];
  p.steps.forEach((st, i) => lines.push(`${i + 1}. <b>${esc(st.t)}</b> — ${esc(st.when)} <i>(${esc(st.org)})</i>`));
  lines.push("", p.deadline ? (p.daysLeft < 0 ? `<b>${esc(T("expiredDays", { n: -p.daysLeft }))}</b>` : `<b>${esc(T("deadlineLine", { label: p.deadlineLabel, n: p.daysLeft }))}</b>`) : `<b>${esc(T("noDeadline"))}</b>`);
  const norms = p.norms.filter(n => n?.lawUrl).slice(0, 4);
  if (norms.length){
    lines.push("", `<b>${esc(T("laws"))}:</b>`);
    for (const n of norms) lines.push(`• <a href="${esc(n.lawUrl)}">${esc([n.lawName, n.article].filter(Boolean).join(", "))}</a> — ${esc(n.title)}`);
  }
  const o = p.offices[0];
  if (o){
    lines.push("", `<b>${esc(T("office"))}:</b> ${esc(o.name)}`);
    for (const ph of (o.phones || []).slice(0, 2)) lines.push(`☎️ ${esc(ph.label)}: ${esc(ph.text)}`);
    if (o.links?.[0]) lines.push(`🔗 <a href="${esc(o.links[0].url)}">${esc(o.links[0].label)}</a>`);
  }
  lines.push("", `<i>${esc(T("disclaimer"))}</i>`);
  return { text: lines.join("\n"), keyboard: [[btn(T("bCalLong"), "cal"), btn(T("bDocLong"), "doc")]] };
}

// 4-ekran: ariza
export function recipientsScreen(sess, { today = new Date() } = {}){
  const T = botT(sess.lang), p = planFor(sess, today);
  return { text: esc(T("pickRecipient")), keyboard: p.info.docs.map(d => [btn(d.label, `rcp:${d.id}`)]) };
}

const howKind = d => d.id === "court" ? "howCourt" : d.howto?.links?.length ? "howState" : "howPrivate";
export async function makeDocuments(sess, { today = new Date() } = {}){
  const T = botT(sess.lang);
  const v = vDocument({ scenario: sess.scenario, recipient: sess.recipient, triggerDate: sess.triggerDate, form: sess.form, lang: base(sess.lang) });
  let m = documentModel({ ...v, lang: base(sess.lang), today });
  if (sess.lang === "cyr") m = cyrillicModel(m);
  const [pdf, docx] = await Promise.all([toPdf(m), toDocx(m)]);
  const d = scenarioOf(sess.scenario, sess.lang).docs.find(x => x.id === m.recipient);
  const caption = [T("signSubmit"), T(howKind(d)), ...(m.missing.length ? [T("blanks", { n: m.missing.length })] : [])].join("\n");
  const name = `HuquqYol-${m.scenario}-${m.recipient}`;
  return { files: [{ name: `${name}.pdf`, data: pdf }, { name: `${name}.docx`, data: Buffer.from(docx) }], caption, missing: m.missing };
}

// 5-ekran: kalendar (.ics) — saytdagi eksport bilan bir xil tarkib
export function calendarFile(sess, { today = new Date(), siteUrl = "" } = {}){
  const p = planFor(sess, today);
  if (!p.deadline) return { text: esc(botT(sess.lang)("calNone")) };
  return { file: { name: `HuquqYol-${p.scenario}-${p.deadline}.ics`, data: Buffer.from(buildIcs(p, makeT(sess.lang), { today, siteUrl }), "utf8") }, caption: botT(sess.lang)("calCaption") };
}

// «boshqa»: bazada yo‘q holat — sohalar
export function otherScreen(lang){
  const T = botT(lang), domains = kbFor(base(lang)).DOMAINS;
  const label = d => lang === "cyr" ? cyr(d.title) : d.title;
  const rows = [];
  for (let i = 0; i < domains.length; i += 2) rows.push(domains.slice(i, i + 2).map(d => btn(label(d), `area:${d.id}`)));
  return { text: [esc(T("other")), "", esc(T("otherWhere"))].join("\n"), keyboard: rows };
}
export function areaScreen(lang, domainId){
  const T = botT(lang), list = kbFor(base(lang)).SCENARIOS.filter(s => s.domain === domainId);
  return { text: esc(T("pickScenario")), keyboard: list.map(s => [btn(lang === "cyr" ? cyr(s.title) : s.title, `scn:${s.id}`)]) };
}
