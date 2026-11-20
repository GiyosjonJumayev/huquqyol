import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { app } from "../server/index.js";

let server, base;
before(() => new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => { server.closeAllConnections?.(); server.close(); });
const post = (p, b) => fetch(base + p, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(b) });

test("GET /api/meta", async () => {
  const m = await (await fetch(base + "/api/meta")).json();
  assert.equal(m.scenarios.length, 23);
  assert.equal(m.domains.length, 12);
  assert.ok(!JSON.stringify(m).includes("keywords"));  // ichki ma’lumot chiqmaydi
});

test("POST /api/analyze", async () => {
  const r = await (await post("/api/analyze", { text:"Ish beruvchim 3 oydan beri maosh bermayapti, qarzi 9 million so‘m" })).json();
  assert.equal(r.scenario, "ish_haqi");
  assert.equal(r.facts.form.amount, "9000000");
  assert.ok(r.retrieval.norms.length > 0);
  assert.equal((await post("/api/analyze", { text:"" })).status, 400);
});

test("POST /api/document/preview — to‘ldirilmagan joylar belgilanadi", async () => {
  const m = await (await post("/api/document/preview", { scenario:"ish_haqi", recipient:"employer", form:{ fio:"Karimov Aziz" } })).json();
  const parts = m.blocks.flatMap(b => b.parts || b.lines?.flat() || []);
  assert.ok(parts.some(p => p.v?.includes("Karimov Aziz")));
  assert.ok(parts.some(p => p.ph === "tashkilot nomi"));
});

test("DOCX va PDF fayllar", async () => {
  const body = { scenario:"hisob_kitob", recipient:"court", triggerDate:"2026-10-01", form:{ fio:"Karimov Aziz", amount:"4500000" } };
  const d = await post("/api/document/docx", body);
  assert.equal(d.status, 200);
  const db = Buffer.from(await d.arrayBuffer());
  assert.equal(db.subarray(0, 2).toString(), "PK");
  const p = await post("/api/document/pdf", body);
  const pb = Buffer.from(await p.arrayBuffer());
  assert.equal(pb.subarray(0, 5).toString(), "%PDF-");
  assert.equal((await post("/api/document/exe", body)).status, 404);
});

test("Noma’lum holat — 400", async () => {
  assert.equal((await post("/api/plan", { scenario:"xyz" })).status, 400);
});

test("Mavzu: hy_theme cookie bo‘yicha sahifa shu mavzuda chiziladi (miltillashsiz); noto‘g‘ri qiymat e’tiborsiz", async () => {
  const dark = await (await fetch(base + "/", { headers:{ cookie:"hy_theme=dark" } })).text();
  assert.match(dark, /<html data-theme="dark" /);
  assert.match(dark, /data-theme-toggle/);
  assert.match(dark, /class="site-head"/);
  assert.match(dark, /class="site-foot"/);
  assert.doesNotMatch(await (await fetch(base + "/", { headers:{ cookie:"hy_theme=evil\"" } })).text(), /data-theme="/);
  assert.match(await (await fetch(base + "/statistika", { headers:{ cookie:"hy_theme=light" } })).text(), /data-theme="light"/);
  assert.match(await (await fetch(base + "/yoq-sahifa", { headers:{ cookie:"hy_theme=dark" } })).text(), /data-theme="dark"/);
  const js = await fetch(base + (/src="(\/theme\.js\?v=[^"]+)"/.exec(dark)[1]));
  assert.equal(js.status, 200);
});
