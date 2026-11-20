import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { app } from "../server/index.js";
import { _setClient } from "../server/analyze.js";
import { vPhoto, readPhoto, cleanDoc, docToForm, MAX_PHOTO_BYTES } from "../server/photo.js";
import { SCENARIO_BY_ID } from "../server/kb.js";
import { toISO, addDays, startOfDay } from "../server/dates.js";
import { shutdown as ocrShutdown } from "../server/ocr.js";
import { readFileSync } from "node:fs";

const fixture = name => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));

// Eng kichik haqiqiy JPEG sarlavhasi + to‘ldiruvchi baytlar (magic bytes tekshiruvi uchun)
const jpeg = (n = 400) => Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(n)]);
const dataUrl = (buf, type = "image/jpeg") => `data:${type};base64,${buf.toString("base64")}`;
const daysAgo = n => toISO(addDays(startOfDay(), -n));

// Soxta Claude: rasmli so‘rovga hujjat JSON, matnli so‘rovga tasnif JSON qaytaradi
function fakeClient({ doc, cls }){
  const calls = [];
  return { calls, messages:{ create: async req => {
    calls.push(req);
    const content = req.messages[0].content;
    const isImage = Array.isArray(content) && content.some(c => c.type === "image");
    return { content:[{ type:"text", text: JSON.stringify(isImage ? doc : cls) }] };
  } } };
}

test("vPhoto: faqat haqiqiy JPG/PNG/WEBP, hajm cheklangan", () => {
  const ok = vPhoto({ image: dataUrl(jpeg()) });
  assert.equal(ok.mediaType, "image/jpeg");
  assert.throws(() => vPhoto({}), { key:"photoFormat" });
  assert.throws(() => vPhoto({ image: "data:image/gif;base64,R0lGODlh" }), { key:"photoFormat" });
  assert.throws(() => vPhoto({ image: dataUrl(Buffer.alloc(400, 1)) }), { key:"photoFormat" });          // sarlavha JPEG, ichi emas
  assert.throws(() => vPhoto({ image: dataUrl(jpeg(), "image/png") }), { key:"photoFormat" });           // tur mos emas
  assert.throws(() => vPhoto({ image: dataUrl(jpeg(MAX_PHOTO_BYTES)) }), { key:"photoBig" });
  assert.throws(() => vPhoto({ image: "data:image/jpeg;base64,/9j/<script>" }), { key:"photoFormat" });
});

test("cleanDoc: kelajakdagi sana, noto‘g‘ri summa va noma’lum tur tashlanadi", () => {
  const d = cleanDoc({ doc_type:"xxx", date: toISO(addDays(startOfDay(), 5)), amount_som:"abc", issuer:"  YHXX\u0000 boshqarmasi ", number:"A".repeat(200) });
  assert.equal(d.docType, "boshqa");
  assert.equal(d.date, null);
  assert.equal(d.amount, null);
  assert.equal(d.issuer, "YHXX boshqarmasi");
  assert.equal(d.number.length, 60);
});

test("docToForm: hujjat maydonlari faqat holatda bor maydonlarga tushadi", () => {
  const f = docToForm(SCENARIO_BY_ID.yhxx_jarima, { issuer:"Toshkent sh. YHXX", number:"AB 1234567", amount:375000, plate:"01 A 123 BC" });
  assert.deepEqual(f, { organ:"Toshkent sh. YHXX", fine:"375000", decisionNumber:"AB 1234567", plate:"01 A 123 BC" });
  const q = docToForm(SCENARIO_BY_ID.qarz, { issuer:"X", number:"1", plate:"01 A" });
  assert.equal(q.plate, undefined);
  assert.equal(q.debtor, "X");
});

test("readPhoto: YHXX jarima qarori — holat, muddat sanasi va ariza maydonlari", async () => {
  const date = daysAgo(3);
  const c = fakeClient({
    doc: { readable:true, doc_type:"yhxx_qarori", title:"Ma’muriy huquqbuzarlik to‘g‘risidagi qaror", issuer:"Toshkent sh. YHXX boshqarmasi", number:"AB 1234567",
           date, amount_som:375000, plate:"01 A 123 BC", reason:"Tezlikni oshirish, MJtK 128³-modda", situation:"Menga YHXX 375 000 so‘m jarima soldi." },
    cls: { scenario:"yhxx_jarima", confidence:0.9, summary:"YHXX jarimasi.", party:null, amount_som:null, event_date:null, missing:[], norm_ids:[] }
  });
  _setClient(c);
  try {
    const r = await readPhoto({ mediaType:"image/jpeg", data: jpeg().toString("base64"), note:"" });
    assert.equal(r.source, "photo");
    assert.equal(r.analysisSource, "ai");
    assert.equal(r.scenario, "yhxx_jarima");
    assert.equal(r.facts.eventDate, date);                       // muddat hujjat sanasidan
    assert.equal(r.facts.form.fine, "375000");
    assert.equal(r.facts.form.decisionNumber, "AB 1234567");
    assert.equal(r.facts.form.organ, "Toshkent sh. YHXX boshqarmasi");
    assert.equal(r.photo.plate, "01 A 123 BC");
    // Birinchi so‘rov — rasm (base64), ikkinchisi — odatdagi matn tasnifi
    assert.equal(c.calls[0].messages[0].content[0].type, "image");
    assert.equal(c.calls[0].messages[0].content[0].source.media_type, "image/jpeg");
    assert.match(c.calls[1].messages[0].content, /BILIM BAZASI/);
  } finally { _setClient(null); }
});

test("readPhoto: AI yo‘q — bepul OCR o‘qiydi (telefon surati: qiyshiq, notekis yorug‘lik)", async () => {
  _setClient(null);
  const r = await readPhoto({ mediaType:"image/jpeg", data: fixture("yhxx-qaror-foto.jpg").toString("base64"), note:"" });
  assert.equal(r.source, "photo");
  assert.equal(r.photo.engine, "ocr");
  assert.equal(r.scenario, "yhxx_jarima");
  assert.equal(r.facts.eventDate, "2026-11-14");
  assert.equal(r.facts.form.fine, "375000");
  assert.equal(r.facts.form.decisionNumber, "AB 1234567");
  assert.equal(r.facts.form.plate, "01 A 123 BC");                 // OCR «OLA 123 BC» deb o‘qigan — tuzatildi
  assert.match(r.facts.form.organ, /Yo.l harakati xavfsizligi boshqarmasi/);
  assert.ok(r.photo.confidence > 70);
  assert.match(r.photo.text, /QAROR QILDI/);
});

test("readPhoto: OCR — rus tilidagi qaror va do‘kon cheki; fuqaro izohi hujjat turidan ustun", async () => {
  _setClient(null);
  const ru = await readPhoto({ mediaType:"image/jpeg", data: fixture("ru-postanovlenie-foto.jpg").toString("base64") });
  assert.equal(ru.scenario, "yhxx_jarima");
  assert.equal(ru.facts.eventDate, "2026-11-12");
  assert.equal(ru.facts.form.fine, "412000");
  assert.equal(ru.facts.form.plate, "30 B 456 CA");
  assert.match(ru.facts.form.organ, /ГУВД Самаркандской области/);
  const chek = await readPhoto({ mediaType:"image/jpeg", data: fixture("chek.jpg").toString("base64") });
  assert.equal(chek.photo.docType, "chek");
  assert.equal(chek.scenario, "nuqsonli_tovar");
  assert.equal(chek.facts.form.price, "4850000");
  assert.equal(chek.facts.form.seller, "«TEXNOMART» MChJ");
  assert.equal(chek.facts.eventDate, "2026-11-03");
  const back = await readPhoto({ mediaType:"image/jpeg", data: fixture("chek.jpg").toString("base64"), note:"Televizor sifatli, lekin rangi to‘g‘ri kelmadi, sotuvchi almashtirib bermayapti" });
  assert.equal(back.scenario, "tovar_qaytarish");
});

test("readPhoto: AI xatosi yoki «o‘qib bo‘lmadi» — OCR ga o‘tadi; bo‘sh rasm — 422", async () => {
  _setClient({ messages:{ create: async () => { throw new Error("tarmoq"); } } });
  const r = await readPhoto({ mediaType:"image/jpeg", data: fixture("chek.jpg").toString("base64") });
  assert.equal(r.photo.engine, "ocr");
  assert.equal(r.photo.docType, "chek");
  _setClient(fakeClient({ doc:{ readable:false }, cls:{} }));
  const r2 = await readPhoto({ mediaType:"image/jpeg", data: fixture("chek.jpg").toString("base64") });
  assert.equal(r2.photo.engine, "ocr");
  _setClient(null);
  await assert.rejects(readPhoto({ mediaType:"image/jpeg", data: fixture("bosh.jpg").toString("base64") }), { key:"photoUnread", status:422 });
});

let server, base;
before(() => new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(async () => { server.close(); await ocrShutdown(); });
const post = (b, h = {}) => fetch(base + "/api/photo", { method:"POST", headers:{ "Content-Type":"application/json", ...h }, body: JSON.stringify(b) });

test("POST /api/photo: AI kalitisiz ishlaydi; bo‘sh rasm — 422, noto‘g‘ri rasm — 400, boshqa sayt — 403", async () => {
  _setClient(null);
  const r = await post({ image: dataUrl(fixture("yhxx-qaror-foto.jpg")) });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.scenario, "yhxx_jarima");
  assert.equal(j.photo.engine, "ocr");
  assert.equal((await post({ image: dataUrl(fixture("bosh.jpg")) })).status, 422);
  assert.equal((await post({ image:"salom" })).status, 400);
  assert.equal((await post({ image: dataUrl(jpeg()) }, { Origin:"https://evil.example" })).status, 403);
  // Umumiy API chegarasi (32 KB) boshqa marshrutlarda saqlanadi
  assert.equal((await fetch(base + "/api/analyze", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text:"a".repeat(40_000) }) })).status, 413);
});

test("POST /api/photo: rus tilida javob, hujjat matni transliteratsiya qilinmaydi (cyr)", async () => {
  _setClient(fakeClient({
    doc: { readable:true, doc_type:"yhxx_qarori", issuer:"YHXX", number:"AB 1", date: daysAgo(1), amount_som:250000, situation:"Menga YHXX jarima soldi." },
    cls: { scenario:"yhxx_jarima", confidence:0.9, summary:"Jarima.", missing:[], norm_ids:[] }
  }));
  try {
    const r = await (await post({ image: dataUrl(jpeg()), lang:"cyr" })).json();
    assert.equal(r.scenario, "yhxx_jarima");
    assert.equal(r.photo.issuer, "YHXX");                       // asl hujjatdagidek
    assert.equal(r.photo.docType, "yhxx_qarori");
  } finally { _setClient(null); }
});
