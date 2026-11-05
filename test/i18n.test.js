// Ikki til (o‘zbek lotin/kirill va rus): baza mosligi, API, hujjatlar, tasnif
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { app } from "../server/index.js";
import { kbFor } from "../server/kb.js";
import { analyze } from "../server/analyze.js";
import { documentModel } from "../server/documents.js";
import { buildPlan } from "../server/plan.js";
import { makeT, fmtDate, termText, plural } from "../public/i18n.js";
import { resolveLang } from "../server/i18n.js";

let server, base;
before(() => new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => server.close());
const post = (p, b, h = {}) => fetch(base + p, { method:"POST", headers:{ "Content-Type":"application/json", ...h }, body: JSON.stringify(b) });
const LATIN = /[A-Za-z]{4,}/;
const text = m => m.blocks.map(b => b.text || [...(b.parts || []), ...(b.lines || []).flat(), ...(b.items || []).flat(), ...(b.right || [])].map(p => p.v ?? p.ph).join("")).join("\n");

test("Ruscha baza o‘zbekchaga to‘liq mos: tuzilma, kalitlar, matnlar", () => {
  const uz = kbFor("uz"), ru = kbFor("ru");
  assert.equal(ru.SCENARIOS.length, uz.SCENARIOS.length);
  assert.equal(ru.NORMS.length, uz.NORMS.length);
  for (const [i, s] of ru.SCENARIOS.entries()){
    const u = uz.SCENARIOS[i];
    assert.deepEqual(s.fields.map(f => [f.k, f.type]), u.fields.map(f => [f.k, f.type]));
    assert.deepEqual(s.docs.map(d => d.id), u.docs.map(d => d.id));
    assert.deepEqual(s.deadline.months ?? s.deadline.days ?? s.deadline.years ?? null, u.deadline.months ?? u.deadline.days ?? u.deadline.years ?? null);
    for (const str of [s.title, s.lead, ...s.steps.map(x => x.t), ...s.evidence, ...s.fields.map(f => f.label), ...s.docs.flatMap(d => [d.label, d.title, ...d.howto.steps])])
      assert.ok(!LATIN.test(str.replace(/my\.sud\.uz|my\.gov\.uz|Texnomart|Samsung|HuquqYo‘l|pm\.gov\.uz/g, "")), `${s.id}: «${str}» tarjima qilinmagan`);
  }
  for (const n of ru.NORMS) assert.ok(/[а-я]/i.test(n.title) && /[а-я]/i.test(n.text), n.id);
  assert.equal(ru.NORM_BY_ID.m333.article, "Статья 333");
});

test("Til aniqlash: tana → ?lang → cookie → Accept-Language", () => {
  const r = (o = {}) => resolveLang({ body:o.body, query:o.query || {}, headers:o.headers || {} });
  assert.equal(r(), "uz");
  assert.equal(r({ body:{ lang:"lat" } }), "uz");
  assert.equal(r({ body:{ lang:"ru" }, headers:{ cookie:"hy_lang=cyr" } }), "ru");
  assert.equal(r({ headers:{ cookie:"a=1; hy_lang=cyr" } }), "cyr");
  assert.equal(r({ headers:{ "accept-language":"ru-RU,ru;q=0.9,en;q=0.8" } }), "ru");
  assert.equal(r({ headers:{ "accept-language":"uz-Cyrl-UZ" } }), "cyr");
  assert.equal(r({ body:{ lang:"xx" } }), "uz");
});

test("Bosh sahifa uch tilda serverda chiziladi", async () => {
  const ru = await (await fetch(base + "/?lang=ru")).text();
  assert.match(ru, /<html lang="ru" data-lang="ru">/);
  assert.ok(ru.includes("Ваши права нарушены?") && ru.includes("4 ситуации →") && ru.includes('data-lang="ru" aria-pressed="true"'));
  assert.ok(!/\{\{\w+\}\}/.test(ru), "to‘ldirilmagan shablon kaliti qolmagan");
  const cyr = await (await fetch(base + "/", { headers:{ cookie:"hy_lang=cyr" } })).text();
  assert.ok(cyr.includes("Ҳуқуқингиз бузилдими?") && cyr.includes('lang="uz-Cyrl"'));
  const uz = await (await fetch(base + "/", { headers:{ "accept-language":"en-US" } })).text();
  assert.ok(uz.includes("Huquqingiz buzildimi?"));
  const set = (await fetch(base + "/?lang=ru")).headers.get("set-cookie");
  assert.match(set, /hy_lang=ru/);
});

test("API ruscha va kirillcha javob beradi, xatolar ham shu tilda", async () => {
  const p = await (await post("/api/plan", { scenario:"ish_haqi", triggerDate:"2026-08-01", form:{ amount:"9000000", months:"3" }, lang:"ru" })).json();
  assert.equal(p.info.title, "Не выплачивают зарплату");
  assert.match(p.deadlineText, /февраля 2027 г\./);
  assert.match(p.calc.value, /^не менее .* сум$/);
  const c = await (await post("/api/plan", { scenario:"jarima", lang:"cyr" })).json();
  assert.ok(c.info.title === "Жаримага рози эмасман" && c.scenario === "jarima" && /^\d{4}-/.test(c.trigger));
  const m = await (await fetch(base + "/api/meta?lang=ru")).json();
  assert.equal(m.domains[0].title, "Труд");
  assert.equal(m.scenarios[0].fields[0].k, "employer");
  const e1 = await (await post("/api/plan", { scenario:"yo‘q", lang:"ru" })).json();
  assert.equal(e1.error, "Неизвестная ситуация.");
  const e2 = await (await post("/api/document/preview", { scenario:"ish_haqi", form:{ phone:"abc" }, lang:"ru" })).json();
  assert.equal(e2.error, "Неверный номер телефона.");
  const e3 = await fetch(base + "/api/plan", { method:"POST", body:"x", headers:{ "accept-language":"ru" } });
  assert.equal(e3.status, 415);
  assert.equal((await e3.json()).error, "Запрос должен быть в формате JSON.");
});

test("Ruscha matndan 11 holat tasniflanadi (AIsiz)", async () => {
  const cases = {
    "Работодатель 3 месяца не платит зарплату, долг 9 млн сум": "ish_haqi",
    "Меня уволили без предупреждения": "ishdan_boshatish",
    "Не дают отпуск уже второй год": "tatil",
    "Уволился, а расчёт не дали и трудовую книжку не отдают": "hisob_kitob",
    "Телевизор из магазина сломался через 2 недели, не меняют": "nuqsonli_tovar",
    "Купил куртку, размер не подошёл, магазин не принимает обратно": "tovar_qaytarish",
    "Бывший муж не платит алименты на двоих детей": "aliment",
    "Обратился в хокимият, уже месяц нет ответа": "murojaat_javobsiz",
    "Хоким вынес незаконное решение о сносе моего магазина": "organ_qarori",
    "СБДД выписали неправильный штраф по радару": "jarima",
    "Друг не возвращает долг 20 млн сум, есть расписка": "qarz",
    "Иш берувчим 3 ойдан бери маош бермаяпти": "ish_haqi",
    "Соседская собака укусила меня": "boshqa"
  };
  for (const [t, want] of Object.entries(cases)) assert.equal((await analyze(t, "ru")).scenario, want, t);
  const a = await analyze("Работодатель 3 месяца не платит зарплату, долг 9 млн сум", "ru");
  assert.deepEqual(a.facts.form, { amount:"9000000", months:"3" });
  assert.equal((await analyze("Бывший муж не платит алименты на двоих детей", "ru")).facts.form.children, "2");
});

test("Har bir ruscha hujjat to‘liq ruscha, DOCX va PDF yasaladi", async () => {
  for (const s of kbFor("ru").SCENARIOS) for (const d of s.docs){
    const m = documentModel({ scenario:s.id, recipient:d.id, lang:"ru", form:{ fio:"Каримов Азиз", amount:"9000000", children:"2", demand:"refund", price:"5000000" }, triggerDate:"2026-09-01", evidence:[0] });
    const t = text(m);
    assert.ok(!LATIN.test(t.replace(/Texnomart/g, "")), `${s.id}/${d.id}: ${t.match(/.*[A-Za-z]{4}.*/)?.[0]}`);
    assert.ok(!/[{}[\]]{2}|\[\?|\[\//.test(t), `${s.id}/${d.id}: shablon belgisi qoldi`);
    assert.ok(t.includes("Приложения:") && t.includes("Подпись:"));
  }
  const al = text(documentModel({ scenario:"aliment", recipient:"court", lang:"ru", form:{ children:"2" }, triggerDate:"2026-09-01" }));
  assert.ok(al.includes("в размере одной трети всех видов заработка"));
  const r = await post("/api/document/pdf", { scenario:"qarz", recipient:"court", lang:"ru", form:{ fio:"Каримов Азиз" } });
  assert.equal(r.status, 200);
  assert.equal(Buffer.from(await r.arrayBuffer()).subarray(0, 4).toString(), "%PDF");
  const dx = await post("/api/document/docx", { scenario:"ish_haqi", recipient:"court", lang:"ru", form:{ fio:"Каримов Азиз" } });
  assert.equal(dx.status, 200);
});

test("Formatlash: sana, muddat, ko‘plik, tarjima", () => {
  const d = new Date(2027, 1, 5);
  assert.equal(fmtDate(d, "ru"), "5 февраля 2027 г.");
  assert.equal(fmtDate(d, "uz"), "5-fevral 2027-yil");
  assert.equal(fmtDate(d, "cyr"), "5-феврал 2027-йил");
  assert.equal(termText({ months:6 }, "ru"), "6 месяцев");
  assert.equal(termText({ days:3 }, "ru"), "3 дня");
  assert.equal(termText({ years:1 }, "cyr"), "1 йил");
  assert.equal(plural(21, ["a","b","c"]), "a"); assert.equal(plural(12, ["a","b","c"]), "c"); assert.equal(plural(3, ["a","b","c"]), "b");
  assert.equal(makeT("ru")("casesCount", { n:5 }), "5 ситуаций →");
  assert.equal(makeT("cyr")("hero"), "Ҳуқуқингиз бузилдими?");
  assert.equal(makeT("cyr")("homeLabel"), "HuquqYo‘l — бошига қайтиш");   // brend nomi o‘zgarmaydi
  const p = buildPlan({ scenario:"aliment", lang:"ru", form:{ children:"1" }, today:new Date(2026, 10, 5) });
  assert.equal(p.risk.label, "Срок не ограничен");
  assert.match(p.calc.value, /360\s400 сум/);
});

test("Uzun hujjatda sahifa raqamlari qo‘yiladi", async () => {
  const { toPdf } = await import("../server/documents.js");
  const m = documentModel({ scenario:"ish_haqi", recipient:"court", lang:"ru", form:{ fio:"Каримов Азиз", extra:"Длинный текст. ".repeat(250) } });
  const pdf = (await toPdf(m)).toString("latin1");
  assert.ok((pdf.match(/\/Type \/Page\b/g) || []).length >= 2);
});
