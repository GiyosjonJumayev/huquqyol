// Yurist yo‘nalishlari bazasi: tuzilma, rasmiy manbalar, ikki til mosligi, shablon maydonlari, erkin hujjat (kimga, imzo)
import { test } from "node:test";
import assert from "node:assert/strict";
import { PRACTICE, SCENARIOS, DOMAINS } from "../server/kb.js";
import { areaList, vCustom } from "../server/business.js";
import { practiceData, practiceCounts, officialUrl, vAct, cleanAreas } from "../server/practice.js";
import { customModel, toDocx, toPdf } from "../server/documents.js";

test("Baza: barcha sohalar katalog sohalari bilan bir xil; har birida qonun, shablon va ish ro‘yxati bor", () => {
  assert.deepEqual([...PRACTICE.areas].sort(), areaList("uz").map(a => a.id).sort());
  for (const lang of ["uz", "cyr", "ru"]) for (const [id, c] of Object.entries(practiceCounts(lang))){
    assert.ok(c.law >= 2, `${id}: qonun`); assert.ok(c.tpl >= 5, `${id}: shablon`); assert.ok(c.top.length >= 1, id);
  }
  for (const a of PRACTICE.areas){
    assert.ok(PRACTICE.checklists[a].length >= 4, a);
    assert.ok(PRACTICE.templates.some(t => !t.common && t.areas.includes(a)), `${a}: o‘z shabloni`);
  }
});

test("Hujjatlar: faqat lex.uz havolasi, takrorsiz, nomi ikki tilda; modda raqami yozilmagan", () => {
  const urls = new Set();
  for (const a of PRACTICE.acts){
    assert.match(a.url, /^https:\/\/lex\.uz\/docs\/\d+$/); assert.ok(!urls.has(a.url), a.url); urls.add(a.url);
    assert.ok(a.t[0].length > 5 && /[а-яё]/i.test(a.t[1]) && !/[a-z]{4}/i.test(a.t[1]), a.id);
    if (a.date) assert.ok(new Date(a.date) < new Date("2026-11-26") && !Number.isNaN(Date.parse(a.date)), a.id);
  }
  for (const t of PRACTICE.templates) for (const s of t.text) assert.ok(!/\d+\s*-?\s*(modda|стать)|стат(ья|ьи|ье)\s*\d/i.test(s), `${t.id}: modda raqami`);
});

test("Shablonlar: uz va ru maydonlari bir xil, har bir maydon ta’riflangan; har bir xatboshi juft", () => {
  for (const t of PRACTICE.templates){
    const keys = i => [...new Set([...t.text[i].matchAll(/\{\{(\w+)\}\}/g), ...t.to[i].join(" ").matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))].sort();
    assert.deepEqual(keys(0), keys(1), t.id); assert.deepEqual([...t.fields].sort(), keys(0), t.id);
    for (const k of keys(0)) assert.ok(PRACTICE.fields[k], k);
    assert.equal(t.text[0].split("\n\n").length, t.text[1].split("\n\n").length, t.id);
    assert.equal(t.to[0].length, t.to[1].length, t.id);
  }
});

test("practiceData: til bo‘yicha; kirillda {{kalit}} va identifikatorlar buzilmaydi; «yangi» belgisi sanadan hisoblanadi", () => {
  const cyr = practiceData("cyr"), ru = practiceData("ru"), uz = practiceData("uz", [], Date.parse("2026-11-25"));
  assert.match(cyr.acts.find(a => a.id === "lex6257288").title, /^Меҳнат кодекси$/);
  assert.match(cyr.templates.find(t => t.id === "sorov").text, /\{\{client\}\}/);
  assert.equal(ru.acts.find(a => a.id === "lex6257288").title, "Трудовой кодекс");
  assert.equal(uz.scenarios.length, SCENARIOS.length);
  for (const d of DOMAINS) assert.ok(uz.norms.some(n => n.areas.includes(d.id)) && uz.offices.some(o => o.areas.includes(d.id)), d.id);
  assert.equal(uz.acts.find(a => a.id === "lex8151376").isNew, true);          // MChJ qonuni, 21.04.2026
  assert.equal(uz.acts.find(a => a.id === "lex54503").isNew, false);           // Advokatura, 1996
  const custom = { id: "c1", type: "buyruq", t: ["Sinov buyrug‘i", "Тестовый приказ"], num: "1", date: "2026-11-01", url: "https://lex.uz/docs/1", areas: ["soliq"], custom: true };
  assert.equal(practiceData("uz", [custom]).acts[0].id, "c1");
  assert.equal(practiceCounts("uz", [custom]).soliq.order, practiceCounts("uz").soliq.order + 1);
});

test("Admin hujjati: faqat rasmiy manba; sohasiz yoki noma’lum turda — xato", () => {
  for (const ok of ["https://lex.uz/docs/1", "https://www.lex.uz/acts/-5", "https://adliya.gov.uz/a", "https://gov.uz/x", "https://public.sud.uz/1"]) assert.ok(officialUrl(ok), ok);
  for (const bad of ["http://lex.uz/docs/1", "https://lex.uz.evil.com/", "https://evilgov.uz/", "https://lex.uz:8443/", "https://a@lex.uz/", "javascript:alert(1)", "", "https://notlex.uz/"]) assert.equal(officialUrl(bad), null, bad);
  const b = { type: "buyruq", titleUz: "Sinov buyrug‘i", url: "https://lex.uz/docs/1", areas: ["soliq", "yoq"], date: "2026-01-02" };
  assert.deepEqual(vAct(b).areas, ["soliq"]);
  for (const x of [{ areas: [] }, { type: "x" }, { url: "https://example.com" }, { titleUz: "a" }, { date: "2026-13-45" }]) assert.throws(() => vAct({ ...b, ...x }));
  assert.deepEqual(cleanAreas(["oila", "oila", "x"]), ["oila"]); assert.deepEqual(cleanAreas("oila"), []);
});

test("Erkin hujjat: «kimga» qatorlari va imzosiz variant — DOCX va PDF", async () => {
  const v = vCustom({ title: "ADVOKAT SO‘ROVI", text: "Birinchi.\n\nIkkinchi.", to: ["Rahbarga", "", "advokat X dan"], sign: false });
  assert.deepEqual(v.to, ["Rahbarga", "advokat X dan"]);
  const m = customModel(v);
  assert.deepEqual(m.blocks.map(b => b.t), ["addr", "title", "p", "p"]);
  assert.equal(customModel(vCustom({ title: "T", text: "Matn" })).blocks.at(-1).t, "sign");
  assert.equal((await toDocx(m)).subarray(0, 2).toString(), "PK");
  assert.equal((await toPdf(m)).subarray(0, 4).toString(), "%PDF");
});
