import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, _setClient, aiLastError, aiReady } from "../server/analyze.js";

const fake = reply => ({ messages:{ create: async req => { fake.last = req; return { content:[{ type:"text", text: reply }] }; } } });

test("AI javobi: JSON o‘qiladi, bazada yo‘q norma tashlanadi", async () => {
  const c = fake('Mana: {"scenario":"ish_haqi","confidence":0.93,"summary":"Sizga 3 oy maosh berilmagan.","party":"«Bog‘bon Agro» MChJ","position":"omborchi","amount_som":9000000,"months":3,"event_date":"2026-08-04","missing":["F.I.Sh."],"norm_ids":["m253","m333","m999"]}');
  _setClient(c);
  const r = await analyze("3 oydan beri maosh bermayapti");
  assert.equal(r.source, "ai");
  assert.equal(r.facts.form.position, "omborchi");
  assert.equal(r.facts.form.employer, "«Bog‘bon Agro» MChJ");
  assert.equal(r.facts.eventDate, "2026-08-04");
  assert.deepEqual(r.normIds, ["m253", "m333"]);
  assert.match(fake.last.messages[0].content, /BILIM BAZASI/);
  _setClient(null);
});

test("AI xatosi — qoidalarga qaytadi", async () => {
  _setClient({ messages:{ create: async () => { throw new Error("tarmoq"); } } });
  const r = await analyze("3 oydan beri maosh bermayapti");
  assert.equal(r.source, "rules");
  assert.equal(r.scenario, "ish_haqi");
  _setClient(null);
});

test("AI xatosidan keyin 5 daqiqa AI chaqirilmaydi; aiLastError — faqat holat va vaqt, matn emas", async () => {
  let calls = 0;
  _setClient({ messages:{ create: async () => { calls++; throw Object.assign(new Error("Sirli matn 12345"), { status: 529 }); } } });
  assert.equal(aiLastError(), null);
  await analyze("3 oydan beri maosh bermayapti");
  assert.equal(calls, 1);
  assert.equal(aiReady(), false);
  const r = await analyze("3 oydan beri maosh bermayapti");
  assert.equal(calls, 1, "pauza ichida AI chaqirilmaydi");
  assert.equal(r.source, "rules");
  const e = aiLastError();
  assert.equal(e.status, 529);
  assert.deepEqual(Object.keys(e).sort(), ["at", "status"]);
  assert.doesNotMatch(JSON.stringify(e), /Sirli|12345|maosh/);
  _setClient(null);
  assert.equal(aiLastError(), null);
});
