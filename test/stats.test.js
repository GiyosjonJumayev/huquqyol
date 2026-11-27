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

test("Davr hisoboti: 7/30/90/365 kun, oldingi davr bilan solishtirish, faol foydalanuvchilar, hudud, rasm va yuristga yuborish", () => {
  let now = Date.UTC(2026, 10, 20, 6);
  const s = createStats({ file:null, now: () => now, flushMs:0 });
  const sd = { ish_haqi:"mehnat", aliment:"oila" };
  // 40 kun oldin (30 kunlik davrdan tashqari, oldingi davrda): 1 ta reja
  now -= 40 * 864e5;
  s.record("open", { scenario:"ish_haqi", domain:"mehnat", ip:"old" });
  now += 40 * 864e5;
  // Bugun: 2 kishi, 3 reja, 1 hujjat (Samarqand), 1 rasm, 1 yuristga
  s.record("open", { scenario:"ish_haqi", domain:"mehnat", ip:"a" });
  s.record("open", { scenario:"aliment", domain:"oila", ip:"a" });
  s.record("open", { scenario:"ish_haqi", domain:"mehnat", ip:"b" });
  s.record("doc", { scenario:"ish_haqi", domain:"mehnat", region:"samarqand", ip:"a" });
  s.record("photo", { scenario:"ish_haqi", ip:"b" });
  s.record("lawyer", { scenario:"ish_haqi", domain:"mehnat", ip:"a" });
  assert.equal(s.record("doc", { scenario:"aliment", domain:"oila", region:"../x", ip:"c" }), true);   // noto‘g‘ri hudud — sanalmaydi, hujjat sanaladi
  const r = s.report({ scenarioDomain: sd, period: 30 });
  assert.equal(r.period, 30);
  assert.deepEqual([r.current.users, r.current.opens, r.current.docs, r.current.photo, r.current.lawyer], [3, 3, 2, 1, 1]);
  assert.deepEqual(r.current.byDomain, { mehnat:2, oila:1 });
  assert.deepEqual(r.current.byRegion, { samarqand:1 });
  assert.deepEqual(r.current.byScenario, { ish_haqi:2, aliment:1 });
  assert.deepEqual(r.current.lawByDomain, { mehnat:1 });
  assert.equal(r.previous.opens, 1);                                 // 40 kun oldingisi — oldingi 30 kunlik davrda
  assert.equal(r.series.length, 30);
  assert.equal(r.series.at(-1).opens, 3);
  // 90 kun — 13 ta haftalik bo‘lak; 365 kun — oylar; noto‘g‘ri davr — 30
  assert.equal(s.report({ scenarioDomain: sd, period: 90 }).series.length, 13);
  const y = s.report({ scenarioDomain: sd, period: 365 });
  assert.ok(y.series.length >= 12 && y.series.length <= 13 && y.series.every(b => /^\d{4}-\d{2}$/.test(b.month)));
  assert.equal(y.current.opens, 4);
  assert.equal(s.report({ period: 45 }).period, 30);
  assert.equal(s.report({ scenarioDomain: sd, period: 7 }).previous.opens, 0);
});

test("API va sahifa: davrlar, CSV (UTF-8 BOM), hudud faqat viloyat nomi; inline uslub va skript yo‘q", async () => {
  const r = await post("/api/document/docx", { scenario:"ish_haqi", form:{ district:"Chilonzor tumani", fio:"Maxfiy Odam" } });
  assert.equal(r.status, 200);
  const j = await (await fetch(base + "/api/stats?davr=7")).json();
  assert.equal(j.report.period, 7);
  assert.ok(j.report.current.byRegion.toshkent_shahri >= 1);
  assert.ok(!JSON.stringify(j).includes("Chilonzor") && !JSON.stringify(j).includes("Maxfiy"));
  const c = await fetch(base + "/api/stats.csv?davr=365");
  assert.equal(c.status, 200);
  assert.match(c.headers.get("content-type"), /text\/csv/);
  const bytes = new Uint8Array(await c.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);      // Excel UTF-8 ni to‘g‘ri ochishi uchun BOM
  const csv = new TextDecoder().decode(bytes);
  assert.match(csv, /hudud_hujjat,toshkent_shahri,Toshkent shahri,\d+,\d+/);
  for (const [p, word] of [["7", "7 kun"], ["30", "30 kun"], ["90", "3 oy"], ["365", "1 yil"]]){
    const h = await (await fetch(base + "/statistika?davr=" + p)).text();
    assert.match(h, new RegExp(`aria-current="page">${word}<`), p);
    assert.ok(!/\sstyle=/.test(h) && !/<script(?![^>]*\ssrc=)/.test(h), p);
    assert.equal((h.match(/<th scope="row" role="rowheader">/g) || []).length >= 12 + 14, true, p);   // 12 soha + 14 hudud
  }
  assert.match(await (await fetch(base + "/statistika?davr=30&lang=ru")).text(), /город Ташкент/);
});
