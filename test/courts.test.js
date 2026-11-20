import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { COURTS, SCENARIOS, SCENARIO_BY_ID, kbFor } from "../server/kb.js";
import { findPlace, courtFromForm, courtName, allCourts, placeOptions } from "../public/courts.js";
import { documentModel } from "../server/documents.js";
import { app } from "../server/index.js";

const civil = t => findPlace(COURTS, t)?.place?.civil;
const text = m => m.blocks.flatMap(b => [...(b.lines || []).flat(), ...(b.parts || []), ...(b.items || []).flat()]).map(p => p.v ?? `[${p.ph}]`).join(" ");

test("Sudlar bazasi: PF-6034 10-ilova — 14 hudud, 205 tuman va shahar, 80 fuqarolik sudi", () => {
  assert.equal(COURTS.regions.length, 14);
  assert.equal(placeOptions(COURTS).length, 205);
  assert.equal(allCourts(COURTS, "civil").length, 80);
  assert.equal(allCourts(COURTS, "admin").length, 14);
  assert.match(COURTS.source.url, /lex\.uz\/docs\/4910826/);
  for (const r of COURTS.regions) for (const d of r.districts){
    assert.match(d.civil, /^Fuqarolik ishlari bo‘yicha .+ (tumanlararo|tuman|shahar) sudi$/, d.name);
    assert.match(d.civilCyr, /^Фуқаролик ишлари бўйича /, d.name);
  }
});

test("Tuman → sud: lotin, kirill va ruscha yozuvlar; tumanlararo sudlar", () => {
  assert.equal(civil("Chilonzor tumani"), "Fuqarolik ishlari bo‘yicha Uchtepa tumanlararo sudi");
  assert.equal(civil("Чилонзор тумани"), "Fuqarolik ishlari bo‘yicha Uchtepa tumanlararo sudi");
  assert.equal(civil("Чиланзарский район"), "Fuqarolik ishlari bo‘yicha Uchtepa tumanlararo sudi");
  assert.equal(civil("р-н Сергели"), "Fuqarolik ishlari bo‘yicha Yakkasaroy tumanlararo sudi");
  assert.equal(civil("Yunusobod tumani"), "Fuqarolik ishlari bo‘yicha Mirzo-Ulug‘bek tumanlararo sudi");
  assert.equal(civil("Mirzo Ulug‘bek tumani"), "Fuqarolik ishlari bo‘yicha Mirzo-Ulug‘bek tumanlararo sudi");
  assert.equal(civil("Shofirkon tumani"), "Fuqarolik ishlari bo‘yicha G‘ijduvon tumanlararo sudi");
  assert.equal(civil("Olmaliq shahri"), "Fuqarolik ishlari bo‘yicha Ohangaron tumanlararo sudi");
  assert.equal(civil("Коканд"), "Fuqarolik ishlari bo‘yicha Qo‘qon tumanlararo sudi");
  assert.equal(civil("Urgut tumani"), "Fuqarolik ishlari bo‘yicha Urgut tuman sudi");
  // Datalist qiymati: «tuman, hudud»
  assert.equal(civil("Mirobod tumani, Toshkent shahri"), "Fuqarolik ishlari bo‘yicha Mirobod tumanlararo sudi");
});

test("Shahar va bir xil nomli tuman: turli sudga qarasa — tanlash so‘raladi (Samarqand)", () => {
  assert.equal(civil("Samarqand sh."), "Fuqarolik ishlari bo‘yicha Samarqand shahar sudi");
  assert.equal(civil("Samarqand tumani"), "Fuqarolik ishlari bo‘yicha Tayloq tumanlararo sudi");
  const amb = findPlace(COURTS, "Samarqand");
  assert.deepEqual(amb.options.map(o => o.name).sort(), ["Samarqand shahri", "Samarqand tumani"]);
  // Bir sudga qarasa — farqi yo‘q
  assert.equal(civil("Qarshi"), "Fuqarolik ishlari bo‘yicha Qarshi tumanlararo sudi");
});

test("Manzildan (strict): faqat «tumani / sh. / район» yonidagi nom; ko‘cha nomi shahar emas", () => {
  const s = t => findPlace(COURTS, t, { strict: true });
  assert.equal(s("Toshkent sh., Chilonzor t., Bunyodkor ko‘chasi 5")?.place.name, "Chilonzor tumani");
  assert.equal(s("г. Ташкент, Мирабадский район, ул. Навои 3")?.place.name, "Mirobod tumani");
  assert.equal(s("Samarqand viloyati, Urgut tumani, Mustaqillik 1")?.place.name, "Urgut tumani");
  assert.equal(s("A. Navoiy ko‘chasi 12"), null);
  assert.equal(s("Chilonzor 5-mavze"), null);
  assert.equal(s("Toshkent sh.").region.name, "Toshkent shahri");
  assert.equal(s("Toshkent sh.").place, undefined);
});

test("Ma’muriy va jinoyat ishlari bo‘yicha sudlar", () => {
  assert.equal(courtFromForm(COURTS, { kind:"admin", from:["agency"] }, { agency:"Denov tumani hokimligi" }).name, "Termiz tumanlararo ma’muriy sudi");
  assert.equal(courtFromForm(COURTS, { kind:"admin", from:["agency"] }, { agency:"Pensiya jamg‘armasining Chilonzor tumani bo‘limi" }).name, "Toshkent tumanlararo ma’muriy sudi");
  assert.equal(courtFromForm(COURTS, { kind:"admin", from:["agency"] }, { agency:"Toshkent sh. hokimligi" }).name, "Toshkent tumanlararo ma’muriy sudi");
  assert.equal(courtFromForm(COURTS, { kind:"criminal" }, { district:"Mirobod tumani" }).name, "Jinoyat ishlari bo‘yicha Mirobod tuman sudi");
  assert.equal(courtFromForm(COURTS, { kind:"criminal" }, { district:"Qarshi sh." }).name, "Jinoyat ishlari bo‘yicha Qarshi shahar sudi");
  assert.equal(courtName(findPlace(COURTS, "Mirobod tumani"), "criminal", { cyr:true }), "Жиноят ишлари бўйича Миробод туман суди");
});

test("Har bir sud shablonida {{court}}; sud turi va qoidasi bor", () => {
  for (const s of SCENARIOS){
    const d = s.docs.find(x => x.id === "court");
    if (!d){ assert.equal(s.court, undefined, s.id); continue; }
    assert.equal(d.to[0], "{{court}}ga", s.id);
    assert.ok(["civil", "admin", "criminal"].includes(s.court.kind), s.id);
    assert.ok(s.fields.some(f => f.k === "court" && f.type === "court"), s.id);
    assert.ok(s.court.rule.length > 40, s.id);
  }
  assert.equal(SCENARIO_BY_ID.qarz.court.kind, "civil");
  assert.deepEqual(SCENARIO_BY_ID.qarz.court.from, ["debtorAddress"]);       // FPK 33: javobgarning yashash joyi
  assert.ok(SCENARIO_BY_ID.aliment.court.from.includes("address"));         // FPK 34: da’vogarning yashash joyi ham
  assert.equal(SCENARIO_BY_ID.organ_qarori.court.kind, "admin");
  assert.equal(SCENARIO_BY_ID.yhxx_jarima.court.kind, "criminal");
});

test("Hujjat: sud tuman yoki javobgar manzilidan avtomatik; qo‘lda yozilgani ustun", () => {
  const m = form => text(documentModel({ scenario:"qarz", recipient:"court", form, triggerDate:"2026-09-01" }));
  assert.match(m({ district:"Yunusobod tumani" }), /^Fuqarolik ishlari bo‘yicha Mirzo-Ulug‘bek tumanlararo sudiga/);
  assert.match(m({ debtorAddress:"Toshkent sh., Sergeli t., 5-uy" }), /^Fuqarolik ishlari bo‘yicha Yakkasaroy tumanlararo sudiga/);
  assert.match(m({ district:"Yunusobod tumani", court:"Fuqarolik ishlari bo‘yicha Mirobod tumanlararo sudi" }), /^Fuqarolik ishlari bo‘yicha Mirobod tumanlararo sudiga/);
  // Tuman noma’lum — to‘ldirilmagan joy, sud maydoniga bog‘langan
  const d = documentModel({ scenario:"qarz", recipient:"court", form:{}, triggerDate:"2026-09-01" });
  assert.ok(d.missing.some(x => x.k === "court"));
  // Ruscha hujjat: rasmiy nom kirillda
  const ru = text(documentModel({ scenario:"qarz", recipient:"court", lang:"ru", form:{ district:"Чиланзарский район" }, triggerDate:"2026-09-01" }));
  assert.match(ru, /^В суд: Фуқаролик ишлари бўйича Учтепа туманлараро суди/);
  // Ma’muriy sud — idora nomidan
  const adm = text(documentModel({ scenario:"pensiya", recipient:"court", form:{ agency:"Pensiya jamg‘armasining Denov tumani bo‘limi" }, triggerDate:"2026-09-01" }));
  assert.match(adm, /^Termiz tumanlararo ma’muriy sudiga/);
  // Davlat boji iltimosnomasi ham shu sudga
  assert.match(text(documentModel({ scenario:"qarz", recipient:"boji", form:{ district:"Urgut tumani" }, triggerDate:"2026-09-01" })), /^Fuqarolik ishlari bo‘yicha Urgut tuman sudiga/);
});

test("«Qayerga yozish kerak?»: yuqori organ maydonlari uchun ikki tilda takliflar", () => {
  const ids = SCENARIOS.filter(s => s.whereTo).map(s => s.id).sort();
  assert.deepEqual(ids, ["ijtimoiy_nafaqa", "jarima", "murojaat_javobsiz", "murojaat_umumiy", "pensiya", "yhxx_jarima"]);
  const ru = kbFor("ru").SCENARIO_BY_ID;
  for (const id of ids){
    const w = SCENARIO_BY_ID[id].whereTo, r = ru[id].whereTo;
    assert.ok(SCENARIO_BY_ID[id].fields.some(f => f.k === w.field), id);
    assert.equal(r.items.length, w.items.length, id);
    assert.equal(r.field, w.field, id);
    assert.ok(w.items.some(i => i.fill), id + ": kamida bitta tayyor nom");
  }
  const reg = findPlace(COURTS, "Denov tumani hokimligi", { strict:true }).region;
  assert.equal(reg.hokimlik, "Surxondaryo viloyati hokimligi");
  assert.equal(reg.prokuratura, "Surxondaryo viloyati prokuraturasi");
  assert.equal(reg.ru.hokimlik, "Хокимият Сурхандарьинской области");
  const tsh = COURTS.regions.find(r => r.name === "Toshkent shahri");
  assert.equal(tsh.hokimlik, "Toshkent shahar hokimligi");
  assert.equal(COURTS.regions.find(r => /Respublikasi$/.test(r.name)).hokimlik, "Qoraqalpog‘iston Respublikasi Vazirlar Kengashi");
});

let server, base;
before(() => new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => server.close());

test("GET /api/courts — keshlanadi; meta: sud va «Qayerga» ma’lumoti, kirillda kalitlar o‘zgarmaydi", async () => {
  const r = await fetch(base + "/api/courts");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).regions.length, 14);
  assert.equal((await fetch(base + "/api/courts", { headers:{ "If-None-Match": r.headers.get("etag") } })).status, 304);
  const cyr = await (await fetch(base + "/api/meta", { headers:{ Cookie:"hy_lang=cyr" } })).json();
  const q = cyr.scenarios.find(s => s.id === "qarz"), p = cyr.scenarios.find(s => s.id === "pensiya");
  assert.deepEqual(q.court.from, ["debtorAddress"]);
  assert.equal(q.court.kind, "civil");
  assert.match(q.court.rule, /ФПК 33-модда/);                               // matn kirillda, kalitlar lotinda
  assert.equal(p.whereTo.field, "higherAgency");
  assert.equal(p.whereTo.for, "higher");
});
