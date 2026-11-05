// Brauzerda to‘liq oqim testi (Playwright). Ishga tushirish: npm run test:e2e
// Playwright o‘rnatilmagan bo‘lsa, test o‘tkazib yuboriladi. CHROME_PATH bilan tizimdagi brauzerni ko‘rsatish mumkin.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { app } from "../../server/index.js";

const require = createRequire(import.meta.url);
let pw = null;
try { pw = await import("playwright"); } catch {}
const skip = !pw && "playwright o‘rnatilmagan (npm i --no-save playwright)";
let axe = null;
try { axe = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8"); } catch {}

let server, base, browser;
before(async () => {
  if (skip) return;
  await new Promise(r => { server = app.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${server.address().port}/`; r(); }); });
  browser = await pw.chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
});
after(async () => { await browser?.close(); server?.close(); });

async function page(opts = {}){
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, acceptDownloads:true, bypassCSP:true, ...opts });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", e => p.errors.push(String(e)));
  p.on("console", m => { if (m.type() === "error") p.errors.push(m.text()); });
  return p;
}
async function audit(p){
  if (!axe) return [];
  await p.addScriptTag({ content: axe });
  return p.evaluate(() => window.axe.run(document, { runOnly:["wcag2a","wcag2aa","wcag21aa","best-practice"] }).then(r => r.violations.map(v => v.id)));
}

test("Soha → holat → reja → ariza → DOCX va PDF", { skip }, async () => {
  const p = await page();
  await p.goto(base);
  await p.waitForSelector(".domain");
  assert.equal(await p.locator(".domain").count(), 6);
  assert.deepEqual(await audit(p), []);
  await p.click("[data-domain='istemol']");
  await p.click("[data-case='nuqsonli_tovar']");
  await p.waitForSelector("#calcValue");
  await p.fill("#c_price", "5000000");
  await p.waitForFunction(() => document.querySelector("#calcValue").textContent.includes("50"));
  assert.deepEqual(await audit(p), []);
  await p.click(".cta [data-go='3']");
  await p.waitForSelector("#paper .ttl");
  assert.equal(await p.inputValue("#f_price"), "5 000 000");          // kalkulyator va forma sinxron
  await p.fill("#f_fio", "Karimov Aziz");
  await p.fill("#f_seller", "«Texnomart» MChJ");
  await p.selectOption("#f_demand", "refund");
  await p.waitForFunction(() => document.querySelector("#paper").textContent.includes("pulni qaytarishni"));
  assert.match(await p.innerText("#howtoH"), /Qanday topshiriladi/);
  await p.click("#seg button[data-r='court']");
  await p.waitForFunction(() => document.querySelector("#paper .ttl").textContent === "DA’VO ARIZASI");
  assert.ok(await p.isVisible("a[href='https://my.sud.uz/']"));
  for (const [btn, magic] of [["#dlDocx", "PK"], ["#dlPdf", "%PDF-"]]){
    const [dl] = await Promise.all([p.waitForEvent("download"), p.click(btn)]);
    const chunks = []; for await (const c of await dl.createReadStream()) chunks.push(c);
    assert.equal(Buffer.concat(chunks).subarray(0, magic.length).toString(), magic);
  }
  assert.deepEqual(await audit(p), []);
  assert.deepEqual(p.errors, []);
});

test("Erkin matn → aliment; doiradan tashqari matn", { skip }, async () => {
  const p = await page();
  await p.goto(base);
  await p.fill("#problem", "Sobiq erim 2 ta bolamga aliment to‘lamayapti");
  await p.click("#analyzeBtn");
  await p.waitForSelector("#calcValue");
  assert.equal(await p.innerText("#v2 h1"), "Aliment undirish kerak");
  assert.equal(await p.inputValue("#c_children"), "2");
  await p.goto(base);
  await p.fill("#problem", "Qo‘shnim mashinamni urib ketdi, nima qilay");
  await p.click("#analyzeBtn");
  await p.waitForSelector("#v2 h1");
  assert.match(await p.innerText("#v2 h1"), /qamramaymiz/);
  assert.deepEqual(p.errors, []);
});

test("Orqaga tugmasi, qayta yuklash, holatlar orasida ma’lumot ajratilishi", { skip }, async () => {
  const p = await page();
  await p.goto(base);
  await p.click("[data-domain='mehnat']");
  await p.click("[data-case='ish_haqi']");
  await p.waitForSelector("#c_amount");
  await p.fill("#c_amount", "9000000");
  await p.click(".cta [data-go='3']");
  await p.fill("#f_fio", "Karimov Aziz");
  await p.goBack();
  assert.equal(await p.evaluate(() => location.hash), "#reja");
  await p.reload();
  await p.waitForSelector("#c_amount");
  assert.equal(await p.inputValue("#c_amount"), "9 000 000");
  await p.goto(base);
  await p.click("[data-domain='fuqarolik']");
  await p.click("[data-case='qarz']");
  await p.click(".cta [data-go='3']");
  assert.equal(await p.inputValue("#f_amount"), "");                 // ish haqi summasi qarzga o‘tmaydi
  assert.equal(await p.inputValue("#f_fio"), "Karimov Aziz");        // ariza beruvchi ma’lumoti umumiy
});

test("Kirill yozuvi, telefon ekrani, qorong‘i mavzu", { skip }, async () => {
  const p = await page({ viewport:{ width:390, height:844 } });
  await p.goto(base);
  await p.waitForSelector(".domain");
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await Promise.all([p.waitForNavigation(), p.click("[data-lang='cyr']")]);
  await p.waitForSelector(".domain");
  assert.equal(await p.innerText("h1.hero"), "Ҳуқуқингиз бузилдими?");
  assert.deepEqual(await audit(p), []);
  const d = await page({ colorScheme:"dark" });
  await d.goto(base);
  await d.click("[data-domain='davlat']");
  await d.click("[data-case='murojaat_javobsiz']");
  await d.waitForSelector("#deadlineCard .big");
  assert.deepEqual(await audit(d), []);
});

test("Rus tili: matn → reja → namuna bilan to‘ldirish → hujjat; til almashganda holat saqlanadi", { skip }, async () => {
  const p = await page({ locale:"ru-RU" });
  await p.goto(base);
  await p.waitForSelector(".domain");
  assert.equal(await p.innerText("h1.hero"), "Ваши права нарушены?");      // brauzer tili bo‘yicha
  assert.deepEqual(await audit(p), []);
  await p.fill("#problem", "Работодатель 3 месяца не платит зарплату, долг 9 млн сум");
  await p.click("#analyzeBtn");
  await p.waitForSelector("#deadlineCard .big");
  assert.equal(await p.innerText("#v2 h1"), "Не выплачивают зарплату");
  assert.match(await p.innerText("#calcValue"), /не менее .* сум/);
  assert.deepEqual(await audit(p), []);
  await p.click(".cta [data-go='3']");
  await p.waitForSelector("#paper .ttl");
  await p.click("#demoFill");
  await p.waitForFunction(() => document.querySelector("#missing").classList.contains("okay"));
  assert.equal(await p.innerText("#paper .ttl"), "ТРЕБОВАНИЕ");
  const dl = p.waitForEvent("download");
  await p.click("#dlPdf");
  assert.match((await dl).suggestedFilename(), /\.pdf$/);
  await Promise.all([p.waitForNavigation(), p.click("[data-lang='uz']")]);
  await p.waitForSelector("#paper .ttl");
  assert.equal(await p.innerText("#v3 h1"), "Arizangiz tayyor");
  assert.equal(await p.innerText("#paper .ttl"), "TALABNOMA");
  assert.equal(await p.inputValue("#f_fio"), "Каримов Азиз Ботирович");
  assert.deepEqual(p.errors, []);
});
