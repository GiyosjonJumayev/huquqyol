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

test("24 holat matndan to‘g‘ri tasniflanadi", () => {
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
    "YHXB radar bo‘yicha noto‘g‘ri jarima soldi": "yhxx_jarima",
    "Sanitariya inspeksiyasi do‘konimga noto‘g‘ri jarima soldi": "jarima",
    "Kvartiradan chiqdim, uy egasi depozitni qaytarmayapti": "ijara_depozit",
    "Uy egasi shartnoma tugamasdan kvartiradan chiqib ketishimni talab qilyapti": "ijara_chiqarish",
    "Svetga ortiqcha hisob keldi, hisoblagich boshqa ko‘rsatyapti": "kommunal_hisob",
    "3 kundan beri gaz yo‘q, ogohlantirmasdan uzib qo‘yishdi": "kommunal_sifat",
    "Kartamdan bilmagan holda 2 million so‘m yechib olishdi": "bank_karta",
    "Mikroqarzni muddatidan oldin to‘lasam ham jarima va katta foiz olishdi": "kredit_mfo",
    "Avtohalokatdan keyin sug‘urta kompaniyasi pul to‘lamayapti": "osgo",
    "Pensiya jamg‘armasi stajimning bir qismini hisobga olmadi": "pensiya",
    "Kam ta’minlangan oila sifatida bolalar nafaqasini rad etishdi": "ijtimoiy_nafaqa",
    "Koreyaga ishga yuboramiz deb agentlik pul olib, aldadi": "migrant_agentlik",
    "Rossiyada ishlayapman, ish beruvchi pasportimni olib qo‘ydi va maosh bermayapti": "migrant_xorij",
    "Do‘stimga qarzga bergan 20 million so‘mni qaytarmayapti, tilxat bor": "qarz",
    "Hokimlikka ariza yozmoqchiman, mahallamizdagi yo‘l buzilgan": "murojaat_umumiy"
  };
  for (const [t, id] of Object.entries(cases)) assert.equal(rankScenarios(t)[0].id, id, t);
});

// Umumiy murojaat (ariza/taklif/shikoyat) qo‘shilganda mavjud holatlar o‘z o‘rnida qolishi kerak
test("Regressiya: umumiy murojaat mavjud holatlarni egallab olmaydi", () => {
  const cases = {
    "Ish beruvchim 3 oydan beri maosh bermayapti": "ish_haqi",
    "Meni ogohlantirmasdan ishdan bo‘shatishdi": "ishdan_boshatish",
    "hokimlikka ariza yozdim 2 oy javob yo'q": "murojaat_javobsiz",
    "hokimlikka ariza yozdim 2 oy javob yo‘q": "murojaat_javobsiz",
    "Hokimlikka murojaat qildim, bir oydan beri javob bermayapti": "murojaat_javobsiz",
    "Menga noto‘g‘ri jarima solishdi, shikoyat qilmoqchiman": "jarima",
    "YHXB radar bo‘yicha noto‘g‘ri jarima soldi": "yhxx_jarima",
    "Do‘kondan telefon oldim, buzilib qoldi, almashtirib berishmayapti": "nuqsonli_tovar",
    "Работодатель 3 месяца не платит зарплату": "ish_haqi",
    "Меня уволили без предупреждения": "ishdan_boshatish",
    "Подал жалобу в хокимият, нет ответа уже 2 месяца": "murojaat_javobsiz",
    "Не согласен со штрафом, хочу подать жалобу": "jarima",
    "Купил телевизор, сломался, магазин не меняет": "nuqsonli_tovar",
    // umumiy kalit so‘zlar («shikoyat qilmoqchiman», «жалоба») aniq holatni bosib ketmasligi
    "Jarimaga shikoyat qilmoqchiman": "jarima",
    "Жалоба на штраф": "jarima",
    "YHXB jarimasi ustidan shikoyat qilmoqchiman": "yhxx_jarima",
    "Хочу подать жалобу на штраф ГАИ по радару": "yhxx_jarima",
    "Svet yo‘qligi bo‘yicha shikoyat qilmoqchiman": "kommunal_sifat",
    "Pensiya jamg‘armasi ustidan shikoyat qilmoqchiman": "pensiya",
    "Bank ustidan shikoyat qilmoqchiman, kartamdan pul yechildi": "bank_karta",
    "Жалоба на хокима, незаконное решение о сносе": "organ_qarori",
    // «заявление в хокимият» (umumiy) javobsiz murojaatni bosib ketmasligi
    "Подал заявление в хокимият, ответа нет 2 месяца": "murojaat_javobsiz",
    "Написал заявление в хокимият, ответа нет 2 месяца": "murojaat_javobsiz",
    "Обратился в хокимият, ответа нет 2 месяца": "murojaat_javobsiz"
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
  // Mikroqarz: yillik chegara — qarzning yarmi
  assert.equal(p("kredit_mfo", "2026-10-01", { loan:"10000000" }).raw.cap, 5_000_000);
  const lc = p("kredit_mfo", "2026-10-01", { loan:"10000000", charged:"6500000" });
  assert.equal(lc.raw.excess, 1_500_000);
  assert.match(lc.value, /1\s500\s000/);
  assert.equal(p("kredit_mfo", "2026-10-01", { loan:"10000000", charged:"3000000" }).raw.excess, 0);
});

test("Yangi holatlar: muddatlar va OSGO qaror sanasi", () => {
  const p = (scenario, triggerDate) => buildPlan({ scenario, triggerDate, today });
  assert.equal(p("yhxx_jarima", "2026-11-01").deadline, "2026-11-11");
  assert.equal(p("ijara_depozit", "2026-10-01").deadline, "2029-10-02");   // 1-oktabr bayram → keyingi ish kuni
  assert.equal(p("pensiya", "2026-10-01").deadline, "2027-04-01");
  assert.equal(p("ijara_chiqarish", "2026-10-01").deadline, null);
  assert.ok(p("osgo", "2026-10-01").steps[1].when.includes("16-oktabr 2026-yil"));   // ariza + 15 kun
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

test("Dalillar yo‘riqnomasi: har bir dalil uchun ahamiyat va qayerdan olinishi", () => {
  for (const s of SCENARIOS){
    assert.equal(s.evidenceInfo.length, s.evidence.length, s.id);
    assert.ok(s.evidenceInfo.every(x => (x.need === "m" || x.need === "f") && x.how.length > 10), s.id);
    assert.ok(s.evidenceInfo.some(x => x.need === "m"), `${s.id}: kamida bitta muhim dalil`);
  }
});

test("Idoralar: faqat rasmiy manbalar, bosiladigan telefonlar, qadamlar bilan bog‘langan", () => {
  const OFFICIAL = /^https:\/\/(?:[\w-]+\.)*(?:gov\.uz|cbu\.uz|napp\.uz|mib\.uz|sud\.uz|mehnat\.uz|mfa\.uz)\//;
  const plan = buildPlan({ scenario:"bank_karta", today });
  assert.deepEqual(plan.offices.map(o => o.id), ["iiv", "cbu", "courts"]);
  assert.match(plan.officesChecked, /2026/);
  for (const s of SCENARIOS){
    const p = buildPlan({ scenario:s.id, today });
    assert.ok(p.offices.length > 0, s.id);
    const ids = new Set(p.offices.map(o => o.id));
    for (const st of p.steps) if (st.office) assert.ok(ids.has(st.office), `${s.id}: ${st.office}`);
    for (const o of p.offices){
      assert.match(o.src, OFFICIAL, `${o.id}: manba rasmiy emas`);
      for (const l of [...(o.links || []), ...(o.local ? [o.local] : [])]) assert.match(l.url, /^https:\/\//, `${o.id}: ${l.url}`);
      for (const ph of [...(o.phones || []), ...(o.abroad || [])]) assert.match(ph.tel, /^\+?\d{3,15}$/, `${o.id}: ${ph.text}`);
    }
  }
  // ariza qabul qiluvchisi idoraga bog‘langan
  assert.equal(SCENARIOS.find(s => s.id === "bank_karta").docs.find(d => d.id === "cbu").office, "cbu");
  assert.equal(SCENARIOS.find(s => s.id === "pensiya").docs.find(d => d.id === "higher").office, "pension");
});
