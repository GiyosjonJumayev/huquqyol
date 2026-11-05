import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { app } from "../server/index.js";

let server, base;
before(() => new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => server.close());
const post = (p, b, type = "application/json") => fetch(base + p, { method:"POST", headers:{ "Content-Type": type }, body: typeof b === "string" ? b : JSON.stringify(b) });

test("Xavfsizlik headerlari", async () => {
  const r = await fetch(base + "/");
  assert.match(r.headers.get("content-security-policy"), /default-src 'self'/);
  assert.match(r.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-frame-options"), "DENY");
  assert.equal(r.headers.get("x-powered-by"), null);
  assert.equal((await fetch(base + "/api/meta")).headers.get("cache-control"), "no-store");
});

test("JSON bo‘lmagan POST — 415, buzuq JSON — 400, katta so‘rov — 413", async () => {
  assert.equal((await post("/api/analyze", "text=salom", "application/x-www-form-urlencoded")).status, 415);
  assert.equal((await post("/api/analyze", "{buzuq")).status, 400);
  assert.equal((await post("/api/analyze", { text:"a".repeat(40_000) })).status, 413);
});

test("Validatsiya: holat, sana, telefon, summa", async () => {
  assert.equal((await post("/api/plan", { scenario:"__proto__" })).status, 400);
  assert.equal((await post("/api/plan", { scenario:"ish_haqi", triggerDate:"2099-01-01" })).status, 400);
  assert.equal((await post("/api/plan", { scenario:"ish_haqi", triggerDate:"2026-02-31" })).status, 400);
  assert.equal((await post("/api/plan", { scenario:"ish_haqi", amount:"-5" })).status, 400);
  assert.equal((await post("/api/document/preview", { scenario:"ish_haqi", form:{ phone:"<script>" } })).status, 400);
});

test("Noma’lum maydonlar tashlanadi, boshqaruv belgilari tozalanadi", async () => {
  const m = await (await post("/api/document/preview", { scenario:"ish_haqi", recipient:"employer",
    form:{ fio:"Ali‮evil\u0000", isAdmin:true, __proto__:{ x:1 } } })).json();
  const txt = JSON.stringify(m.blocks);
  assert.ok(txt.includes("Alievil"));
  assert.ok(!txt.includes("isAdmin"));
});

test("Belgilangan dalillar ilovalarga qo‘shiladi; to‘ldirilmagan joylar qaytariladi", async () => {
  const m = await (await post("/api/document/preview", { scenario:"ish_haqi", recipient:"inspection", evidence:[1, 99, "x"] })).json();
  const items = m.blocks.filter(b => b.t === "list").at(-1).items.map(i => i[0].v);
  assert.ok(items.some(i => i.startsWith("Bank ko‘chirmasi")));
  assert.ok(m.missing.some(x => x.k === "fio" && x.label === "F.I.Sh."));
});

test("Noma’lum API — 404 JSON", async () => {
  const r = await fetch(base + "/api/yoq");
  assert.equal(r.status, 404);
  assert.ok((await r.json()).error);
});

test("Kirill yozuvidagi hujjat va fayllar", async () => {
  const body = { scenario:"ish_haqi", recipient:"court", lang:"cyr", form:{ fio:"Karimov Aziz", amount:"9000000" } };
  const m = await (await post("/api/document/preview", body)).json();
  assert.equal(m.blocks.find(b => b.t === "title").text, "ДАЪВО АРИЗАСИ");
  assert.ok(JSON.stringify(m.blocks).includes("Каримов Азиз"));
  assert.ok(m.missing.some(x => x.k === "address" && x.label === "манзил"));
  for (const fmt of ["docx", "pdf"]) assert.equal((await post("/api/document/" + fmt, body)).status, 200);
});

test("Bosh sahifa serverda chiziladi; versiyali fayllar bir yil keshlanadi; gzip", async () => {
  const r = await fetch(base + "/", { headers:{ "Accept-Encoding":"gzip" } });
  const html = await r.text();
  assert.equal(r.headers.get("cache-control"), "no-cache");
  assert.equal((html.match(/data-domain="/g) || []).length, 6);
  const meta = JSON.parse(html.match(/<script type="application\/json" id="meta-data">([\s\S]*?)<\/script>/)[1]);
  assert.equal(meta.scenarios.length, 11);
  assert.ok(!/<\/script>[\s\S]*<script(?! type="application\/json")[^>]*>[^<]/.test(html.split('id="meta-data"')[1].slice(100)), "inline JS yo‘q");
  const css = html.match(/\/app\.css\?v=([a-f0-9]+)/);
  assert.ok(css, "app.css versiyalangan");
  const a = await fetch(`${base}/app.css?v=${css[1]}`, { headers:{ "Accept-Encoding":"gzip" } });
  assert.equal(a.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(a.headers.get("content-encoding"), "gzip");
  const js = await (await fetch(base + "/app.js")).text();
  assert.match(js, /from "\/translit\.js\?v=[a-f0-9]+"/);
});

test("Boshqa saytdan POST rad etiladi; o‘z saytidan va Originsiz — ruxsat", async () => {
  const body = JSON.stringify({ scenario:"ish_haqi" });
  const h = origin => ({ method:"POST", headers:{ "Content-Type":"application/json", ...(origin ? { Origin: origin } : {}) }, body });
  const evil = await fetch(base + "/api/plan", h("https://evil.example"));
  assert.equal(evil.status, 403);
  assert.equal((await fetch(base + "/api/plan", h(base))).status, 200);
  assert.equal((await fetch(base + "/api/plan", h(null))).status, 200);
  assert.equal((await fetch(base + "/api/plan", h("null"))).status, 403);
});

test("Noma’lum sahifa — 404 sahifasi; robots.txt; OG teglar", async () => {
  const r = await fetch(base + "/yoq-sahifa", { headers:{ cookie:"hy_lang=ru" } });
  assert.equal(r.status, 404);
  assert.ok((await r.text()).includes("Страница не найдена"));
  assert.match(await (await fetch(base + "/robots.txt")).text(), /Disallow: \/api\//);
  assert.match(await (await fetch(base + "/")).text(), /property="og:title" content="HuquqYo‘l/);
});

test("Mikrofon faqat o‘z saytiga ruxsat etilgan (ovoz bilan kiritish), boshqa ruxsatlar yopiq", async () => {
  const pp = (await fetch(base + "/")).headers.get("permissions-policy");
  assert.match(pp, /microphone=\(self\)/);
  assert.match(pp, /camera=\(\)/);
  assert.match(pp, /geolocation=\(\)/);
});
