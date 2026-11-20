import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { app } from "../server/index.js";
import { _setClient } from "../server/analyze.js";
import { vPhoto, readPhoto, cleanDoc, docToForm, MAX_PHOTO_BYTES } from "../server/photo.js";
import { SCENARIO_BY_ID } from "../server/kb.js";
import { toISO, addDays, startOfDay } from "../server/dates.js";

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

test("readPhoto: o‘qib bo‘lmaydigan rasm — 422; AI yo‘q — 503; AI xatosi — 502", async () => {
  _setClient(fakeClient({ doc:{ readable:false }, cls:{} }));
  await assert.rejects(readPhoto({ mediaType:"image/jpeg", data:"x" }), { key:"photoUnread", status:422 });
  _setClient({ messages:{ create: async () => { throw new Error("tarmoq"); } } });
  await assert.rejects(readPhoto({ mediaType:"image/jpeg", data:"x" }), { key:"photoAi", status:502 });
  _setClient(null);
  await assert.rejects(readPhoto({ mediaType:"image/jpeg", data:"x" }), { key:"photoNoAi", status:503 });
});

let server, base;
before(() => new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => server.close());
const post = (b, h = {}) => fetch(base + "/api/photo", { method:"POST", headers:{ "Content-Type":"application/json", ...h }, body: JSON.stringify(b) });

test("POST /api/photo: AI yo‘q — tushunarli 503, noto‘g‘ri rasm — 400, boshqa sayt — 403", async () => {
  _setClient(null);
  const r = await post({ image: dataUrl(jpeg()) });
  assert.equal(r.status, 503);
  assert.match((await r.json()).error, /AI/);
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
