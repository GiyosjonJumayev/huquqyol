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
  return p.evaluate(() => window.axe.run(document, { runOnly:["wcag2a","wcag2aa","wcag21aa","wcag22aa","best-practice"] }).then(r => r.violations.map(v => v.id)));
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
  await p.click("[data-domain='fuqarolik']");                       // bitta holatli soha to‘g‘ridan-to‘g‘ri rejani ochadi
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
  const ics = p.waitForEvent("download");
  await p.click("#calBtn");
  const icsFile = await (await ics).path();
  const cal = readFileSync(icsFile, "utf8");
  const unfolded = cal.replace(/\r\n /g, "");
  assert.ok(cal.startsWith("BEGIN:VCALENDAR") && unfolded.includes("SUMMARY:Последний день: Не выплачивают зарплату") && cal.includes("BEGIN:VALARM"));
  assert.ok(cal.split("\r\n").every(l => Buffer.byteLength(l) <= 75), "ICS qatorlari 75 baytdan oshmaydi");
  await p.emulateMedia({ media:"print" });
  await p.evaluate(() => document.body.classList.add("print-plan"));
  assert.equal(await p.isVisible("#v2 h1"), true);                  // chop etishda reja ko‘rinadi
  assert.equal(await p.isVisible("#v2 .cta"), false);
  await p.evaluate(() => document.body.classList.remove("print-plan"));
  await p.emulateMedia({ media:"screen" });
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
  assert.equal(await p.innerText("#v3 h1"), "Arizani to‘ldiring");
  assert.equal(await p.innerText("#paper .ttl"), "TALABNOMA");
  assert.equal(await p.inputValue("#f_fio"), "Каримов Азиз Ботирович");
  assert.deepEqual(p.errors, []);
});

test("Noaniq matnda muqobil holat taklif qilinadi va bir bosishda almashtiriladi", { skip }, async () => {
  const p = await page();
  await p.goto(base);
  await p.waitForSelector(".domain");
  assert.equal(await p.locator(".how li").count(), 3);
  await p.fill("#problem", "Meni ishdan bo‘shatishdi va oxirgi oylikni bermadi");
  await p.press("#problem", "Control+Enter");
  await p.waitForSelector("[data-alt]");
  const before = await p.innerText("#v2 h1");
  await p.locator("[data-alt]").first().click();
  await p.waitForFunction(b => document.querySelector("#v2 h1")?.textContent !== b, before);
  assert.equal(await p.locator("[data-alt]").count(), 0);         // tanlangandan keyin taklif yo‘qoladi
  assert.deepEqual(await audit(p), []);
  await p.goto(base);
  await p.fill("#problem", "Ish beruvchim 3 oydan beri maosh bermayapti, qarzi 9 million so‘m");
  await p.click("#analyzeBtn");
  await p.waitForSelector("#deadlineCard .big");
  assert.equal(await p.locator("[data-alt]").count(), 0);         // aniq holatda shovqin yo‘q
  assert.deepEqual(p.errors, []);
});

test("UX standartlari: 320px, teginish maydoni, xato bog‘lanishi, tasdiqlash, boshi berk ko‘cha yo‘q", { skip }, async () => {
  const p = await page({ viewport:{ width:320, height:640 } });
  const small = sel => p.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent && e.getBoundingClientRect().height < 44).map(e => e.id || e.className), sel);
  await p.goto(base);
  await p.waitForSelector(".domain");
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(await small(".langsw button, .morex, .chipbtn, .case"), []);
  // Xato maydonga bog‘langan va matn yozilganda yo‘qoladi
  await p.click("#analyzeBtn");
  assert.equal(await p.getAttribute("#problem", "aria-invalid"), "true");
  assert.ok((await p.getAttribute("#problem", "aria-describedby")).includes("askErr"));
  await p.fill("#problem", "a");
  assert.equal(await p.isVisible("#askErr"), false);
  // Doiradan tashqari ekranida keyingi qadam bor
  await p.fill("#problem", "Qo‘shnim mashinamni urib ketdi, nima qilay");
  await p.click("#analyzeBtn");
  await p.waitForSelector("#v2 [data-to]");
  await p.click("#v2 [data-to]");
  assert.equal(await p.isVisible("[data-domain='oila']"), true);
  // Reja va ariza: 320px da siljish yo‘q, xato matni maydonga bog‘langan
  await p.click("[data-domain='fuqarolik']");
  await p.click(".cta [data-go='3']");
  await p.waitForSelector("#paper .ttl");
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await p.getAttribute("#f_fio", "aria-required"), "true");
  assert.equal(await p.isVisible("#dlNote"), true);
  await p.fill("#f_phone", "abc");
  await p.locator("#f_phone").blur();
  assert.equal(await p.getAttribute("#f_phone", "aria-describedby"), "e_phone");
  assert.equal(await p.isVisible("#e_phone"), true);
  await p.click("#dlPdf");                                          // noto‘g‘ri maydon: yuklanmaydi, fokus xatoga o‘tadi
  assert.equal(await p.evaluate(() => document.activeElement.id), "f_phone");
  await p.fill("#f_phone", "+998 90 123 45 67");
  await p.fill("#f_fio", "Karimov Aziz");
  // O‘chirish tasdiq so‘raydi: bekor qilinsa ma’lumot joyida, Esc ham bekor qiladi
  await p.click("#wipe");
  assert.equal(await p.evaluate(() => document.querySelector("#dlg").open), true);
  assert.equal(await p.evaluate(() => document.activeElement.id), "dlgNo");
  assert.deepEqual(await audit(p), []);
  await p.keyboard.press("Escape");
  assert.equal(await p.inputValue("#f_fio"), "Karimov Aziz");
  await p.click("#wipe");
  await Promise.all([p.waitForNavigation(), p.click("#dlgOk")]);
  await p.waitForSelector(".domain");
  assert.equal(await p.evaluate(() => localStorage.getItem("huquqyol:v2")), null);
  assert.deepEqual(p.errors, []);
});
