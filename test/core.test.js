import { test } from "node:test";
import assert from "node:assert/strict";
import { addMonths, deadlineFrom, toISO } from "../server/dates.js";
import { buildPlan, compensation } from "../server/plan.js";
import { rankScenarios, retrieve } from "../server/rag.js";
import { extractFacts } from "../server/facts.js";
import { analyze } from "../server/analyze.js";

test("MK 9-modda: oy oxiri va yakshanba", () => {
  assert.equal(toISO(addMonths(new Date(2026, 0, 31), 1)), "2026-02-28");
  assert.equal(toISO(deadlineFrom(new Date(2026, 7, 31), 6)), "2027-03-01"); // 28-fev yakshanba → dushanba
  assert.equal(toISO(deadlineFrom(new Date(2026, 7, 4), 6)), "2027-02-04");
});

test("Reja: muddat, xavf va qadamlar", () => {
  const p = buildPlan({ scenario:"ishdan_boshatish", triggerDate:"2026-10-20", today:new Date(2026, 10, 4) });
  assert.equal(p.deadline, "2027-01-20");
  assert.equal(p.daysLeft, 77);
  assert.equal(p.risk.level, "low");
  assert.ok(p.steps.some(s => s.when.includes("20-yanvar 2027-yil")));
  const late = buildPlan({ scenario:"ish_haqi", triggerDate:"2026-04-01", today:new Date(2026, 10, 4) });
  assert.equal(late.risk.level, "expired");
});

test("333-modda kompensatsiyasi: har oy o‘z muddatidan", () => {
  const c = compensation({ amount:3_000_000, months:3, trigger:new Date(2026, 7, 4), today:new Date(2026, 10, 4), rate:14 });
  // 1 mln × (92 + 61 + 31) kun
  assert.equal(c.maxDelayDays, 92);
  assert.equal(c.low, Math.round(1_000_000 * 184 * 0.14 / 365));
  assert.equal(c.high, Math.round(1_000_000 * 184 * 0.14 * 0.10));
});

test("Holat tasnifi (oflayn)", () => {
  const cases = {
    "Ish beruvchim 3 oydan beri maosh bermayapti": "ish_haqi",
    "Meni ogohlantirmasdan ishdan bo‘shatishdi": "ishdan_boshatish",
    "2 yildan beri ta’tilga chiqarishmayapti": "tatil",
    "Ishdan ketdim, hisob-kitob va mehnat daftarchamni berishmayapti": "hisob_kitob"
  };
  for (const [t, id] of Object.entries(cases)) assert.equal(rankScenarios(t)[0].id, id, t);
});

test("RAG: maosh haqidagi savolga 253 va 333-moddalar topiladi", () => {
  const ids = retrieve("maosh kechikyapti, kompensatsiya bormi").norms.map(n => n.id);
  assert.ok(ids.includes("m253") && ids.includes("m333"));
});

test("Faktlar: summa, oy, ish beruvchi", () => {
  assert.deepEqual(extractFacts("«Bog‘bon Agro» MChJ 3 oydan beri, qarzi 9 million so‘m"),
    { amount:9_000_000, months:3, party:"«Bog‘bon Agro» MChJ" });
  assert.equal(extractFacts("2 ta bolam bor").children, 2);
  assert.equal(extractFacts("uch nafar farzandim bor").children, 3);
  assert.equal(extractFacts("qarz 4 500 000 so‘m").amount, 4_500_000);
});

test("Doiradan tashqari matn", async () => {
  const r = await analyze("Qo‘shnim mashinamni urib ketdi, nima qilay");
  if (r.source === "rules") assert.equal(r.scenario, "boshqa");
});
