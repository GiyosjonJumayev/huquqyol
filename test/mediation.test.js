// Mediatsiya: ixtiyoriy qadam, «Mediatsiya taklifi» xati, mediatorlar reyestri.
// Sud muddati to‘xtashi faqat mehnat nizolarida aytiladi (MK 560-modda).
import { test } from "node:test";
import assert from "node:assert/strict";
import { kbFor, SCENARIOS } from "../server/kb.js";
import { buildPlan } from "../server/plan.js";
import { documentModel } from "../server/documents.js";

const today = new Date(2026, 10, 5);
const LABOR = ["ish_haqi", "hisob_kitob", "tatil"];
const CIVIL = ["nuqsonli_tovar", "ijara_depozit", "qarz", "kommunal_hisob"];
const PAUSE = /560|to‘xtab turadi|приостанавлива/;
const REG = "https://gov.uz/oz/adliya/sections/professional-mediatorlar-reyestri";
const txt = m => m.blocks.map(b => JSON.stringify(b)).join(" ");

test("Mediatsiya: 7 holatda sud oldidan ixtiyoriy qadam va xat (uz + ru), boshqalarda yo‘q", () => {
  const uz = kbFor("uz"), ru = kbFor("ru");
  for (const id of [...LABOR, ...CIVIL]){
    const s = uz.SCENARIO_BY_ID[id], r = ru.SCENARIO_BY_ID[id];
    const i = s.steps.findIndex(st => st.org === "Mediator");
    assert.ok(i >= 0, id);
    assert.equal(s.steps[i].t, "Mediator orqali kelishib ko‘ring (ixtiyoriy)");
    assert.equal(s.steps[i + 1].org, "Sud", `${id}: mediatsiya sud qadamidan oldin`);
    assert.equal(r.steps[i].org, "Медиатор");
    assert.equal(r.steps[i].t, "Попробуйте договориться через медиатора (по желанию)");
    const d = s.docs.findIndex(x => x.id === "mediatsiya");
    assert.ok(d >= 0, id);
    assert.equal(r.docs[d].title, "ПРЕДЛОЖЕНИЕ");
    assert.ok(s.norms.includes("med7"), id);
    assert.ok(s.offices.includes("mediators"), id);
    assert.equal(s.docs[d].office, "mediators");
  }
  for (const s of SCENARIOS.filter(x => ![...LABOR, ...CIVIL].includes(x.id))){
    assert.ok(!s.steps.some(st => st.org === "Mediator") && !s.docs.some(d => d.id === "mediatsiya"), s.id);
  }
});

test("Mediatsiya: sud muddati to‘xtashi FAQAT mehnat holatlarida (MK 560)", () => {
  for (const lang of ["uz", "ru"]){
    const kb = kbFor(lang);
    for (const id of [...LABOR, ...CIVIL]){
      const s = kb.SCENARIO_BY_ID[id], i = kbFor("uz").SCENARIO_BY_ID[id].steps.findIndex(st => st.org === "Mediator");
      const d = kbFor("uz").SCENARIO_BY_ID[id].docs.findIndex(x => x.id === "mediatsiya");
      const claim = PAUSE.test(s.steps[i].body) || PAUSE.test(JSON.stringify(s.docs[d]));
      assert.equal(claim, LABOR.includes(id), `${lang}/${id}`);
      if (LABOR.includes(id)) assert.ok(PAUSE.test(s.steps[i].body) && PAUSE.test(JSON.stringify(s.docs[d])), `${lang}/${id}: qadam va xat`);
    }
  }
});

test("Mediatsiya taklifi xati: nizo, summa (bo‘lsa), javob muddati — taklif, qonuniy muddat emas", () => {
  const m = documentModel({ scenario:"ish_haqi", recipient:"mediatsiya", today,
    form:{ fio:"Karimov Aziz", address:"Toshkent", phone:"+998901234567", employer:"«Bog‘bon Agro» MChJ", boss:"Aliyev V.", amount:"9000000" } });
  const t = txt(m);
  assert.deepEqual(m.missing, []);
  assert.equal(m.blocks.find(b => b.t === "title").text, "TAKLIF");
  assert.match(t, /ish haqi to‘lanmagani \(qarz: 9\s000\s000 so‘m\)/);
  assert.ok(t.includes("10 kun ichida") && t.includes("Bu muddat qonunda belgilangan emas"));
  assert.ok(t.includes("Mehnat kodeksining 560-moddasiga ko‘ra"));
  assert.ok(t.includes("«Bog‘bon Agro» MChJ rahbari") && t.includes("Aliyev V.ga"));          // rahbar maydoni xatda ham ishlaydi

  const noSum = txt(documentModel({ scenario:"qarz", recipient:"mediatsiya", today, form:{ debtor:"Valiyev Sardor" } }));
  assert.ok(noSum.includes("qarz qaytarilmagani") && !noSum.includes("(qarz:") && !/560/.test(noSum));

  const ru = documentModel({ scenario:"nuqsonli_tovar", recipient:"mediatsiya", lang:"ru", today,
    form:{ fio:"Каримов Азиз", address:"Ташкент", phone:"+998901234567", seller:"ООО «Техномарт»", sellerAddress:"Ташкент", product:"холодильник", price:"5000000" } });
  const rt = txt(ru);
  assert.deepEqual(ru.missing, []);
  assert.match(rt, /о недостатке купленного товара \(холодильник\), цена: 5\s000\s000 сум/);
  assert.ok(rt.includes("Этот срок не установлен законом") && !PAUSE.test(rt));
});

test("Mediatsiya: reja va idora kartasi — reyestr havolasi, telefon yo‘q", () => {
  const p = buildPlan({ scenario:"qarz", triggerDate:"2026-10-01", today });
  const med = p.offices.find(o => o.id === "mediators");
  assert.ok(med);
  assert.equal(med.links[0].url, REG);
  assert.equal(med.src, REG);
  assert.ok(!med.phones || med.phones.length === 0);
  assert.equal(p.steps[1].office, "mediators");
  assert.ok(p.norms.some(n => n.id === "med7" && n.article === "7-modda"));
  assert.equal(buildPlan({ scenario:"qarz", triggerDate:"2026-10-01", today, lang:"ru" }).offices.find(o => o.id === "mediators").name, "Реестр профессиональных медиаторов");
});
