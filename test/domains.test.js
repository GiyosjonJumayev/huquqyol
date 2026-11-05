import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENARIOS, NORM_BY_ID, fieldsOf } from "../server/kb.js";
import { rankScenarios } from "../server/rag.js";
import { buildPlan } from "../server/plan.js";
import { documentModel, toDocx, toPdf } from "../server/documents.js";
import { vForm } from "../server/validate.js";
import { analyze } from "../server/analyze.js";

const today = new Date(2026, 10, 5);

test("Bilim bazasi yaxlit: har bir norma, maydon va shablon kaliti mavjud", () => {
  for (const s of SCENARIOS){
    for (const id of s.norms) assert.ok(NORM_BY_ID[id], `${s.id}: ${id}`);
    const keys = new Set([...fieldsOf(s).map(f => f.k), ...s.fields.filter(f => f.type === "select").map(f => f.k + "Court"), "applicant", "trigger", "deadline", "deadlineTerm", "share", "today"]);
    for (const d of s.docs) for (const m of JSON.stringify(d).matchAll(/\{\{(\w+)\}\}|\[[?!](\w+)\]/g)) assert.ok(keys.has(m[1] || m[2]), `${s.id}/${d.id}: ${m[1] || m[2]}`);
    assert.ok(s.keywords.length >= 4 && s.evidence.length >= 3 && s.steps.length >= 2, s.id);
  }
});

test("11 holat matndan to‘g‘ri tasniflanadi", () => {
  const cases = {
    "Ish beruvchim 3 oydan beri maosh bermayapti": "ish_haqi",
    "Meni ogohlantirmasdan ishdan bo‘shatishdi": "ishdan_boshatish",
    "2 yildan beri ta’tilga chiqarishmayapti": "tatil",
    "Ishdan ketdim, hisob-kitob va mehnat daftarchamni berishmayapti": "hisob_kitob",
    "Sotib olgan muzlatkichim bir haftada buzilib qoldi, do‘kon almashtirmayapti": "nuqsonli_tovar",
    "Kiyim razmeri to‘g‘ri kelmadi, do‘kon qaytarib olmayapti": "tovar_qaytarish",
    "Sobiq erim bolalarimga aliment to‘lamayapti": "aliment",
    "Hokimlikka murojaat qildim, bir oydan beri javob bermayapti": "murojaat_javobsiz",
    "Hokim qarori bilan uyimni buzib tashlashmoqchi, bu noqonuniy qaror": "organ_qarori",
    "YHXB radar bo‘yicha noto‘g‘ri jarima soldi": "jarima",
    "Do‘stimga qarzga bergan 20 million so‘mni qaytarmayapti, tilxat bor": "qarz"
  };
  for (const [t, id] of Object.entries(cases)) assert.equal(rankScenarios(t)[0].id, id, t);
});

test("Muddatlar: kun, oy, yil, offset va muddatsiz", () => {
  const p = (scenario, triggerDate, form = {}) => buildPlan({ scenario, triggerDate, form, today });
  assert.equal(p("tovar_qaytarish", "2026-11-01").deadline, "2026-11-11");
  assert.equal(p("jarima", "2026-11-01").deadline, "2026-11-11");
  assert.equal(p("qarz", "2026-11-04").deadline, "2029-11-05");            // 4-noyabr 2029 yakshanba → dushanba
  assert.equal(p("murojaat_javobsiz", "2026-10-01").deadline, "2027-04-16");  // 1-okt + 15 kun + 6 oy
  const al = p("aliment", "2026-06-01");
  assert.equal(al.deadline, null);
  assert.equal(al.risk.level, "info");
  assert.ok(p("murojaat_javobsiz", "2026-10-01").steps[0].when.includes("16-oktabr 2026-yil"));
});

test("Kalkulyatorlar", () => {
  const p = (scenario, triggerDate, form) => buildPlan({ scenario, triggerDate, form, today }).calc;
  assert.equal(p("nuqsonli_tovar", "2026-10-01", { price:"5000000", demandDate:"2026-10-25" }).raw.late, 4);   // 1-noyabrdan 4 kun
  assert.match(p("nuqsonli_tovar", "2026-10-01", { price:"5000000", demandDate:"2026-10-25" }).value, /200 000/);
  assert.match(p("nuqsonli_tovar", "2026-10-01", { price:"5000000", demandDate:"2026-11-03" }).value, /Hali penya yo‘q/);
  const al = p("aliment", "2026-06-01", { children:"2", income:"4000000" });
  assert.equal(Math.round(al.raw.byIncome), 1_333_333);
  assert.equal(p("aliment", "2026-06-01", { children:"1", income:"800000" }).raw.min, 360_400);   // eng kam miqdor ustun
  const f = p("jarima", "2026-11-01", { fine:"412000" });
  assert.match(f.value, /206 000/);   // hali 15 kun ichida — 50%
  assert.equal(f.rows.length, 3);
});

test("Har bir holatning har bir hujjati DOCX va PDF bo‘lib yasaladi", async () => {
  for (const s of SCENARIOS) for (const d of s.docs){
    const m = documentModel({ scenario:s.id, recipient:d.id, form:{ fio:"Karimov Aziz" }, evidence:[0, 1], today });
    assert.ok(m.blocks.some(b => b.t === "title"), s.id);
    assert.ok(m.missing.length > 0, `${s.id}/${d.id}: to‘ldirilmagan joylar bor`);
    const docx = await toDocx(m), pdf = await toPdf(m);
    assert.equal(docx.subarray(0, 2).toString(), "PK");
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  }
});

test("Shablon: shartli bo‘laklar va select qiymati", () => {
  const m = documentModel({ scenario:"nuqsonli_tovar", recipient:"seller", today,
    form:{ seller:"«Texnomart» MChJ", product:"muzlatkich", defect:"sovutmaydi", demand:"refund" }, triggerDate:"2026-10-20" });
  const txt = JSON.stringify(m.blocks);
  assert.ok(txt.includes("shartnomani bekor qilib, to‘langan pulni qaytarishni"));
  const court = JSON.stringify(documentModel({ scenario:"nuqsonli_tovar", recipient:"court", today, form:{ demand:"refund" } }).blocks);
  assert.ok(court.includes("shartnomani bekor qilib, javobgardan to‘langan pulni undirishni"));
  const noSel = documentModel({ scenario:"nuqsonli_tovar", recipient:"court", today, form:{} });
  assert.ok(noSel.missing.some(x => x.k === "demand"));   // tanlanmagan talab — to‘ldirilmagan joy
  assert.ok(!txt.includes("so‘mga"));                 // narx kiritilmagan — [?price] bo‘lagi chiqmaydi
  const al = documentModel({ scenario:"aliment", recipient:"court", form:{ children:"3" }, today });
  assert.ok(JSON.stringify(al.blocks).includes("yarmi miqdorida"));
});

test("Holatga xos validatsiya", () => {
  const s = SCENARIOS.find(x => x.id === "nuqsonli_tovar");
  assert.throws(() => vForm(s, { demand:"hack" }), /variant/);
  assert.throws(() => vForm(s, { demandDate:"2099-01-01" }), /kelajakda/);
  assert.deepEqual(vForm(s, { price:"5 000 000", unknown:"x", employer:"y" }), { price:"5000000" });   // boshqa holat maydoni tashlanadi
  const a = SCENARIOS.find(x => x.id === "aliment");
  assert.throws(() => vForm(a, { children:"0" }), /Bolalar soni/);
});

test("Oflayn tahlil faktlarni holat maydonlariga joylaydi", async () => {
  const r = await analyze("«Texnomart» do‘konidan olgan televizor 2 haftada buzilib qoldi, 5 million so‘m to‘laganman");
  assert.equal(r.scenario, "nuqsonli_tovar");
  assert.equal(r.facts.form.seller, "«Texnomart»");
  assert.equal(r.facts.form.price, "5000000");
});
