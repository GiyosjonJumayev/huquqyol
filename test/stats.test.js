// Anonim statistika: faqat sanoqlar; matn, IP va shaxsiy ma’lumot saqlanmaydi
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStats, dayOf } from "../server/stats.js";
import { app } from "../server/index.js";

let server, base;
before(() => new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => server.close());
const post = (p, b) => fetch(base + p, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(b) });

test("Sanash: bir kishi bir kunda bir holat — bir marta; ertasi kuni yana sanaladi", () => {
  let now = Date.UTC(2026, 10, 19, 6);
  const s = createStats({ file:null, now: () => now, flushMs:0 });
  assert.equal(s.record("open", { scenario:"ish_haqi", domain:"mehnat", ip:"1.2.3.4" }), true);
  assert.equal(s.record("open", { scenario:"ish_haqi", domain:"mehnat", ip:"1.2.3.4" }), false);
  assert.equal(s.record("open", { scenario:"ish_haqi", domain:"mehnat", ip:"5.6.7.8" }), true);
  assert.equal(s.record("open", { scenario:"tatil", domain:"mehnat", ip:"1.2.3.4" }), true);
  now += 864e5;
  assert.equal(s.record("open", { scenario:"ish_haqi", domain:"mehnat", ip:"1.2.3.4" }), true);
  const sum = s.summary({ scenarioDomain:{ ish_haqi:"mehnat", tatil:"mehnat" }, days:2 });
  assert.equal(sum.total, 4);
  assert.deepEqual(sum.byDomain, { mehnat:4 });
  assert.deepEqual(sum.series.map(x => x.opens), [3, 1]);
});

test("Noto‘g‘ri holat nomi sanalmaydi; doiradan tashqari va hujjatlar alohida", () => {
  const s = createStats({ file:null, flushMs:0 });
  assert.equal(s.record("open", { scenario:"<script>", domain:"mehnat" }), false);
  assert.equal(s.record("open", { scenario:"ish_haqi", domain:"../x" }), false);
  assert.equal(s.record("hack", {}), false);
  s.record("analyze", { scenario:"boshqa", ip:"a" });
  s.record("analyze", { scenario:"aliment", ip:"b" });
  s.record("doc", { scenario:"aliment", ip:"b" });
  const sum = s.summary({ scenarioDomain:{ aliment:"oila" } });
  assert.deepEqual([sum.analyzed, sum.outOfScope, sum.documents, sum.docsByDomain.oila], [2, 1, 1, 1]);
});

test("Faylga faqat sanoqlar yoziladi: IP, iz va matn yo‘q; qayta yuklanganda saqlanadi", () => {
  const dir = mkdtempSync(join(tmpdir(), "hy-stats-")), file = join(dir, "sub", "stats.json");
  const s = createStats({ file, flushMs:0 });
  s.record("open", { scenario:"qarz", domain:"fuqarolik", ip:"203.0.113.77" });
  s.flush();
  const raw = readFileSync(file, "utf8");
  assert.ok(!raw.includes("203.0.113") && !/ip|salt|seen|hash/i.test(raw), raw);
  assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), ["analyze", "days", "docs", "opens", "since", "v"]);
  assert.ok(!existsSync(file + ".tmp"));
  const s2 = createStats({ file, flushMs:0 });
  assert.equal(s2.summary().byScenario.qarz, 1);
  s.close(); s2.close();
  rmSync(dir, { recursive:true, force:true });
});

test("STATS=0 — hech narsa sanalmaydi va yozilmaydi", () => {
  const s = createStats({ file:null, enabled:false, flushMs:0 });
  assert.equal(s.record("open", { scenario:"qarz", domain:"fuqarolik" }), false);
  assert.equal(s.summary().enabled, false);
});

test("API: reja faqat birinchi ochilishda sanaladi, kalkulyator yangilanishi sanalmaydi; matn statistikaga tushmaydi", async () => {
  const before = await (await fetch(base + "/api/stats")).json();
  await post("/api/plan", { scenario:"osgo", open:true });
  await post("/api/plan", { scenario:"osgo" });
  await post("/api/plan", { scenario:"osgo", open:true });          // shu kishi, shu kun — takror
  const secret = "Mening ismim Maxfiyjon, telefonim 901234567";
  await post("/api/analyze", { text: secret });
  const s = await (await fetch(base + "/api/stats")).json();
  assert.equal((s.byScenario.osgo || 0) - (before.byScenario.osgo || 0), 1);
  assert.equal(s.analyzed - before.analyzed, 1);
  assert.ok(!JSON.stringify(s).includes("Maxfiyjon") && !JSON.stringify(s).includes("901234567"));
  assert.equal(s.series.length, 30);
  assert.equal(s.series.at(-1).day, dayOf());
});

test("Statistika sahifasi: uch tilda, inline style va skript yo‘q, sohalar ro‘yxati to‘liq", async () => {
  for (const [lang, word] of [["uz", "Anonim statistika"], ["cyr", "Аноним статистика"], ["ru", "Анонимная статистика"]]){
    const r = await fetch(base + "/statistika?lang=" + lang);
    assert.equal(r.status, 200);
    const html = await r.text();
    assert.ok(html.includes(word), lang);
    assert.ok(!/\sstyle=|<script(?![^>]*\bsrc=)/.test(html), lang);                 // faqat tashqi modul (Qulaylik oynasi)
    assert.match(html, /<dialog class="a11ydlg" id="a11yDlg"/, lang);
    assert.match(html, /<footer class="sitefoot">/, lang);
    assert.ok((html.match(/<td class="barcell" role="cell">/g) || []).length >= 12, lang);
  }
  assert.match(await (await fetch(base + "/statistika", { headers:{ cookie:"hy_fs=2" } })).text(), /<html data-fs="2"/);
  assert.match(await (await fetch(base + "/")).text(), /href="\/statistika"/);
});

test("Ilovani import qilish diskka yozmaydi: fayl faqat attachFile() bilan ulanadi", () => {
  const dir = mkdtempSync(join(tmpdir(), "hy-stats2-")), file = join(dir, "s.json");
  const s = createStats({ flushMs:0 });
  s.record("open", { scenario:"qarz", domain:"fuqarolik", ip:"x" });
  s.flush();
  assert.ok(!existsSync(file));
  s.attachFile(file);
  s.record("open", { scenario:"aliment", domain:"oila", ip:"x" });
  s.flush();
  assert.equal(JSON.parse(readFileSync(file, "utf8")).opens.aliment, 1);
  s.close(); rmSync(dir, { recursive:true, force:true });
});
