// Umumiy murojaat (ariza / taklif / shikoyat) — Murojaatlar to‘g‘risidagi qonun
import { test } from "node:test";
import assert from "node:assert/strict";
import { kbFor } from "../server/kb.js";
import { buildPlan } from "../server/plan.js";
import { documentModel } from "../server/documents.js";

const today = new Date(2026, 10, 5);
const ID = "murojaat_umumiy";
const text = m => JSON.stringify(m.blocks);
const FORM = {
  fio:"Karimov Aziz Botirovich", address:"Toshkent sh., Chilonzor t., 5-uy", phone:"+998 90 123 45 67",
  body:"Chilonzor tumani hokimligi", subject:"Mahalladagi yo‘lni ta’mirlash",
  facts:"Ko‘chamizdagi yo‘l 2 yildan beri ta’mirlanmagan.", request:"yo‘lni 2027-yil ta’mirlash rejasiga kiritishni"
};

test("Umumiy murojaat: tuzilma — davlat sohasi, normalar, muddatsiz, 3 hujjat, pm idorasi", () => {
  const s = kbFor("uz").SCENARIO_BY_ID[ID], r = kbFor("ru").SCENARIO_BY_ID[ID];
  assert.equal(s.domain, "davlat");
  assert.equal(s.title, "Davlat idorasiga ariza, taklif yoki shikoyat yozish");
  assert.deepEqual(s.norms, ["mq5", "mq6", "mq28", "mq36", "mq38"]);
  assert.equal(s.deadline.none, true);
  assert.match(s.deadline.note, /15 kun.*1 oygacha.*28-modda.*«Javobsiz murojaat»/);
  assert.deepEqual(s.docs.map(d => d.id), ["ariza", "taklif", "shikoyat"]);
  assert.deepEqual(s.fields.map(f => f.k), ["body", "subject", "facts", "request"]);
  assert.deepEqual(s.fields.map(f => f.type), ["text", "text", "textarea", "textarea"]);
  assert.ok(s.offices.includes("pm"));
  for (const k of ["ariza yozmoqchiman", "hokimlikka murojaat", "taklif bermoqchiman", "shikoyat qilmoqchiman", "davlat idorasiga", "заявление в госорган", "жалоба", "предложение", "заявление в хокимият", "написать в хокимият"])
    assert.ok(s.keywords.includes(k), k);
  assert.equal(r.title, "Заявление, предложение или жалоба в госорган");
  assert.match(r.deadline.note, /15 дней.*1 месяца.*ст\. 28.*«Обращение без ответа»/);
  // «taklif» ta’rifi — Qonun matni bo‘yicha
  assert.ok(s.steps[0].body.includes("taklif — davlat va jamiyat faoliyatini takomillashtirishga doir tavsiyalar bayon etilgan murojaat"));
  assert.ok(r.steps[0].body.includes("предложение — обращение с рекомендациями по совершенствованию деятельности государства и общества"));
  assert.ok(!s.steps[0].body.includes("idora ishini yaxshilash") && !r.steps[0].body.includes("улучшению работы органа"));
});

test("Umumiy murojaat: reja — muddat yo‘q, javob kutish 15 kun, pm.gov.uz va ma’muriy sud", () => {
  const p = buildPlan({ scenario:ID, triggerDate:"2026-11-02", today });
  assert.equal(p.deadline, null);
  assert.equal(p.risk.level, "info");
  assert.equal(p.steps.length, 6);
  assert.ok(p.steps[3].when.includes("17-noyabr 2026-yil"));                     // topshirish + 15 kun
  assert.match(p.steps[1].body, /murojaat\.gov\.uz/);
  assert.match(p.steps[4].body, /pm\.gov\.uz/);
  assert.equal(p.steps[5].org, "Ma’muriy sud");
  assert.ok(p.offices.some(o => o.id === "pm"));
  assert.equal(p.evidence.length, 3);
  assert.equal(p.calc, null);
  const ru = buildPlan({ scenario:ID, triggerDate:"2026-11-02", today, lang:"ru" });
  assert.match(ru.steps[3].when, /^до 17 ноября 2026/);
});

test("Umumiy murojaat: majburiy maydonlar to‘ldirilmasa — har bir hujjatda «yetishmaydi»", () => {
  for (const lang of ["uz", "ru"]) for (const recipient of ["ariza", "taklif", "shikoyat"]){
    const m = documentModel({ scenario:ID, recipient, form:{}, today, lang });
    const miss = m.missing.map(x => x.k);
    for (const k of ["body", "subject", "facts", "request", "fio", "address"]) assert.ok(miss.includes(k), `${lang}/${recipient}: ${k}`);
  }
});

test("Umumiy murojaat: 6-modda — F.I.Sh., manzil, idora, mohiyat, imzo (uz)", () => {
  const titles = { ariza:"ARIZA", taklif:"TAKLIF", shikoyat:"SHIKOYAT" };
  for (const [recipient, title] of Object.entries(titles)){
    const m = documentModel({ scenario:ID, recipient, form:FORM, today });
    assert.deepEqual(m.missing, [], recipient);
    const addr = JSON.stringify(m.blocks.find(b => b.t === "addr"));
    assert.ok(addr.includes("Chilonzor tumani hokimligiga"), "idora");
    assert.ok(addr.includes(FORM.fio) && addr.includes(FORM.address), "F.I.Sh. va manzil");
    assert.equal(m.blocks.find(b => b.t === "title").text, title);
    const t = text(m);
    assert.ok(t.includes("Murojaat mavzusi: " + FORM.subject) && t.includes(FORM.facts) && t.includes(FORM.request), "mohiyat");
    assert.ok(t.includes("28-moddasiga ko‘ra"), "javob muddati");
    const sign = m.blocks.find(b => b.t === "sign");
    assert.ok(sign && JSON.stringify(sign.right).includes(FORM.fio), "imzo");
  }
  assert.ok(text(documentModel({ scenario:ID, recipient:"taklif", form:FORM, today })).includes("Taklif qilaman:"));
  assert.ok(text(documentModel({ scenario:ID, recipient:"shikoyat", form:FORM, today })).includes("Avvalgi murojaat va olingan javob nusxalari"));
});

test("Umumiy murojaat: ruscha hujjatlar ham 6-modda talablariga mos", () => {
  const titles = { ariza:"ЗАЯВЛЕНИЕ", taklif:"ПРЕДЛОЖЕНИЕ", shikoyat:"ЖАЛОБА" };
  const form = { ...FORM, body:"хокимият Чиланзарского района", subject:"Ремонт дороги", facts:"Дорогу не ремонтируют 2 года.", request:"включить ремонт дороги в план на 2027 год" };
  for (const [recipient, title] of Object.entries(titles)){
    const m = documentModel({ scenario:ID, recipient, form, today, lang:"ru" });
    assert.deepEqual(m.missing, [], recipient);
    assert.equal(m.blocks.find(b => b.t === "title").text, title);
    const t = text(m);
    assert.ok(t.includes("В хокимият Чиланзарского района") && t.includes("Тема обращения: Ремонт дороги") && t.includes(form.request));
    assert.ok(t.includes("статье 28 Закона «Об обращениях физических и юридических лиц»"));
  }
});

test("Bosh sahifa namunasi: «…chiroqlar haqida taklif bermoqchiman» umumiy murojaatga olib boradi (uz, kirill, ru)", async () => {
  const { examples } = await import("../public/shared.js");
  const { analyze } = await import("../server/analyze.js");
  for (const lang of ["uz", "cyr", "ru"]){
    const ex = examples(lang)[2];
    assert.match(ex, /chiroq|чироқ|освещени/, lang);
    assert.equal((await analyze(ex, lang === "ru" ? "ru" : "uz")).scenario, "murojaat_umumiy", `${lang}: ${ex}`);
  }
});
