import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "hy-biz-"));
process.env.LAWYER_APPS_FILE = join(dir, "apps.jsonl");
const { app } = await import("../server/index.js");
const { LAWYERS, filterLawyers, PLANS } = await import("../server/business.js");
const { documentModel, customModel, toDocx, toPdf } = await import("../server/documents.js");

let server, base;
before(() => new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => server.close());
const get = (p, lang = "uz") => fetch(base + p, { headers:{ Cookie:`hy_lang=${lang}` } });
const post = (p, b) => fetch(base + p, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(b) });

test("Namuna profillar aniq belgilangan: haqiqiy telefon va e-pochta yo‘q", () => {
  assert.ok(LAWYERS.length >= 6);
  for (const l of LAWYERS){
    assert.equal(l.demo, true, l.id);
    assert.match(l.contacts.phone, /^\+998 00 /, l.id);                 // «00» — mavjud bo‘lmagan operator kodi
    assert.match(l.contacts.email, /@example\.com$/, l.id);
    assert.equal(l.license.verified, false, l.id);
    assert.ok(l.services.length && l.services.every(s => Number.isInteger(s.price) && s.price >= 0), l.id);
  }
});

test("Katalog filtri: soha, hudud, shakl; Pro profillar yuqorida", () => {
  assert.ok(filterLawyers({ soha:"mehnat" }).every(l => l.areas.includes("mehnat")));
  assert.ok(filterLawyers({ hudud:"Toshkent shahri", shakl:"online" }).every(l => l.region === "Toshkent shahri" && l.formats.includes("online")));
  const all = filterLawyers({});
  const firstFree = all.findIndex(l => l.plan === "free");
  assert.ok(all.slice(firstFree).every(l => l.plan === "free"));
  assert.equal(PLANS.length, 4);
});

test("Sahifalar uch tilda: tariflar, katalog, profil, kabinet; inline skript va style yo‘q", async () => {
  for (const lang of ["uz", "cyr", "ru"]){
    for (const p of ["/tariflar", "/yuristlar", "/yuristlar?soha=oila&shakl=online", "/yuristlar/namuna-1", "/kabinet"]){
      const r = await get(p, lang), html = await r.text();
      assert.equal(r.status, 200, `${lang} ${p}`);
      assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), `${p}: inline skript`);
      assert.ok(!/\sstyle=/i.test(html), `${p}: style atributi`);
      if (lang === "ru") assert.ok(!/[a-z]{4,}/i.test(html.replace(/<[^>]+>/g, " ").replace(/HuquqYo‘l|Pro|example\.com|namuna\d|lex\.uz|UZ|RU|EN|my\.sud\.uz|O‘zb|Ўзб|DOCX|PDF|JSON|JavaScript/g, "")), `${p}: ruscha sahifada lotin matn`);
    }
  }
  const t = await (await get("/yuristlar")).text();
  assert.match(t, /Namuna/);
  assert.match(t, /profillar namuna, haqiqiy yuristlar emas/);
  const prof = await (await get("/yuristlar/namuna-1")).text();
  assert.match(prof, /haqiqiy yurist emas/);
  assert.match(prof, /\+998 00 000 00 01/);
  assert.ok(!/href="tel:/.test(prof), "namuna profilda qo‘ng‘iroq havolasi bo‘lmaydi");
  assert.equal((await get("/yuristlar/yoq-profil")).status, 404);
  const plans = await (await get("/tariflar")).text();
  for (const s of ["Mijozlar va ishlar kartotekasi", "Barcha muddatlar bitta kalendarda", "O‘z blankasi", "Katalogda profil", "Tashkilot hujjatlari kutubxonasi"]) assert.ok(plans.includes(s), s);
  const kab = await (await get("/kabinet")).text();
  assert.match(kab, /<script type="module" src="\/kabinet\.js\?v=[0-9a-f]{10}"><\/script>/);
});

test("Holatdan katalogga: ?holat= sohani tanlaydi", async () => {
  const html = await (await get("/yuristlar?holat=ish_haqi")).text();
  assert.match(html, /<option value="mehnat" selected>/);
  assert.match(html, /Holatingiz: Ish haqi/);
});

test("Katalogga ariza: rozilik, telefon va e-pochta tekshiriladi; moderatsiya fayliga yoziladi", async () => {
  const ok = { name:"Test Yurist", phone:"+998 90 123 45 67", email:"t@example.com", kind:"advokat", areas:["mehnat", "yoq-soha"], region:"Toshkent shahri", formats:["online"], consent:true };
  assert.equal((await post("/api/lawyers/apply", { ...ok, consent:false })).status, 400);
  assert.equal((await post("/api/lawyers/apply", { ...ok, phone:"abc" })).status, 400);
  assert.equal((await post("/api/lawyers/apply", { ...ok, email:"yomon" })).status, 400);
  assert.equal((await post("/api/lawyers/apply", ok)).status, 201);
  assert.ok(existsSync(process.env.LAWYER_APPS_FILE));
  const rec = JSON.parse(readFileSync(process.env.LAWYER_APPS_FILE, "utf8").trim().split("\n").at(-1));
  assert.equal(rec.status, "pending");
  assert.deepEqual(rec.areas, ["mehnat"]);                                    // noma’lum soha tashlanadi
});

test("Blanka: hujjat tepasida rekvizitlar; o‘z shabloni DOCX va PDF", async () => {
  const m = documentModel({ scenario:"qarz", recipient:"court", form:{}, triggerDate:"2026-09-01", letterhead:["«Adolat» advokatlik byurosi", "Toshkent sh., 1-uy"] });
  assert.equal(m.blocks[0].t, "head");
  assert.equal(m.blocks[0].lines[0][0].v, "«Adolat» advokatlik byurosi");
  assert.equal(m.blocks[1].t, "addr");
  const c = customModel({ title:"ADVOKAT SO‘ROVI", text:"Birinchi xatboshi.\n\nIkkinchi\nxatboshi.", letterhead:["Byuro"] });
  assert.deepEqual(c.blocks.map(b => b.t), ["head", "title", "p", "p", "sign"]);
  assert.equal(c.blocks[3].parts[0].v, "Ikkinchi xatboshi.");
  assert.equal((await toDocx(c)).subarray(0, 2).toString(), "PK");
  assert.equal((await toPdf(c)).subarray(0, 5).toString(), "%PDF-");
  // API: blanka bilan hujjat va o‘z shabloni
  const r = await post("/api/document/preview", { scenario:"qarz", recipient:"court", letterhead:["Byuro", "", "x".repeat(300)] });
  const pm = await r.json();
  assert.equal(pm.blocks[0].t, "head");
  assert.equal(pm.blocks[0].lines.length, 2);
  assert.equal(pm.blocks[0].lines[1][0].v.length, 120);
  const d = await post("/api/custom/pdf", { title:"Xat", text:"Matn", letterhead:["Byuro"] });
  assert.equal(d.status, 200);
  assert.equal(Buffer.from(await d.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
  assert.equal((await post("/api/custom/docx", { title:"Xat", text:"" })).status, 400);
  assert.equal((await post("/api/custom/exe", { text:"Matn" })).status, 404);
});
