// Brauzerda to‘liq oqim testi (Playwright). Ishga tushirish: npm run test:e2e
// Playwright o‘rnatilmagan bo‘lsa, test o‘tkazib yuboriladi. CHROME_PATH bilan tizimdagi brauzerni ko‘rsatish mumkin.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { app } from "../../server/index.js";
import { shutdown as ocrShutdown } from "../../server/ocr.js";
import { fileURLToPath } from "node:url";

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
after(async () => { await browser?.close(); server?.close(); await ocrShutdown(); });

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
  assert.equal(await p.locator(".domain").count(), 12);
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
  assert.ok(await p.isVisible("#howtoLinks a[href='https://my.sud.uz/']"));
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
  await p.fill("#problem", "Patent olish uchun qanday hujjatlar kerak");
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
  await p.fill("#problem", "Patent olish uchun qanday hujjatlar kerak");
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

test("Qayerga borish va dalillar: idora kartalari, qadamdan o‘tish, muhim dalillar, ariza qabul qiluvchisi", { skip }, async () => {
  const p = await page();
  await p.goto(base);
  await p.click("[data-domain='migrant']");
  await p.click("[data-case='migrant_xorij']");
  await p.waitForSelector(".office");
  assert.ok(await p.locator("#of-migration a[href='tel:1282']").count() === 1);
  assert.ok(await p.locator("#evid li.must").count() >= 1);
  assert.ok(await p.locator("#evid .evhow").count() === await p.locator("#evid li").count());
  await p.locator(".ofjump").first().click();
  await p.waitForFunction(() => document.activeElement?.id?.startsWith("of-"));
  await p.click("#of-migration .ofabroad summary");
  assert.ok(await p.isVisible("#of-migration a[href='tel:+79250454744']"));
  assert.deepEqual(await audit(p), []);
  await p.click(".cta [data-go='3']");
  await p.waitForSelector("#paper .ttl");
  await p.click("#seg button[data-r='consul']");
  await p.waitForSelector("#howtoOffice .office");
  assert.match(await p.innerText("#howtoOffice"), /konsullik/i);
  assert.deepEqual(await audit(p), []);
  assert.deepEqual(p.errors, []);
});

// Soxta nutq sintezatori: qaysi matn, qaysi ovoz va tezlikda o‘qilganini yozib boradi
const fakeTTS = ({ uzVoice }) => {
  const said = []; window.__said = said;
  const voices = [{ name:"Russian voice", lang:"ru-RU", localService:true }, ...(uzVoice ? [{ name:"Uzbek voice", lang:"uz-UZ", localService:true }] : [])];
  Object.defineProperty(window, "speechSynthesis", { value:{ paused:false, getVoices:() => voices, addEventListener(){},
    speak(u){ said.push({ text:u.text, lang:u.lang, voice:u.voice?.name, rate:u.rate }); setTimeout(() => u.onstart?.(), 5); },
    cancel(){}, pause(){ this.paused = true; }, resume(){ this.paused = false; } } });
  window.SpeechSynthesisUtterance = function(t){ this.text = t; };
};

test("Qulaylik: shrift o‘lchami saqlanadi, sahifa va reja ovozda o‘qiladi, o‘zbekcha ovoz bo‘lmasa rus ovozi", { skip }, async () => {
  const p = await page();
  await p.context().addInitScript(fakeTTS, { uzVoice:true });
  await p.goto(base);
  await p.waitForSelector(".domain");
  await p.click("#a11yBtn");
  assert.equal(await p.getAttribute("#a11yBtn", "aria-expanded"), "true");
  assert.deepEqual(await audit(p), []);
  const before = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".lead")).fontSize));
  await p.click(".fsopts [data-fs='3']");
  const after = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".lead")).fontSize));
  assert.ok(after / before > 1.45, `${before} → ${after}`);
  assert.equal(await p.getAttribute(".fsopts [data-fs='3']", "aria-pressed"), "true");
  await p.reload();
  await p.waitForSelector(".domain");
  assert.equal(await p.evaluate(() => document.documentElement.dataset.fs), "3");       // server cookie bo‘yicha chizdi
  await p.click("[data-domain='mehnat']");
  await p.click("[data-case='ish_haqi']");
  await p.waitForSelector("#ttsPlan");
  await p.click("#ttsPlan");
  await p.waitForSelector("#ttsBar:not([hidden])");
  const said = await p.evaluate(() => window.__said);
  assert.equal(said[0].voice, "Uzbek voice");
  assert.match(said.map(x => x.text).join(" "), /1-qadam/);
  await p.waitForSelector(".tts-reading");                       // belgilash o‘qish boshlanganda (onstart) qo‘yiladi
  assert.equal(await p.locator(".tts-reading").count(), 1);
  assert.deepEqual(await audit(p), []);
  await p.keyboard.press("Escape");
  assert.equal(await p.isVisible("#ttsBar"), false);
  await p.click(".cta [data-go='3']");
  await p.waitForSelector("#paper .ttl");
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(p.errors, []);

  const q = await page({ viewport:{ width:375, height:740 } });
  await q.context().addInitScript(fakeTTS, { uzVoice:false });
  await q.goto(base);
  await q.waitForSelector(".domain");
  await q.click("#a11yBtn");
  await q.click(".speed [data-rate='0.8']");
  await q.click("#ttsPage");
  await q.waitForSelector(".toast");
  const s2 = await q.evaluate(() => window.__said);
  assert.equal(s2[0].voice, "Russian voice");
  assert.equal(s2[0].rate, 0.8);
  assert.match(s2[0].text, /[а-я]/i);                 // rus ovozi uchun kirillga o‘girilgan
  assert.match(await q.innerText(".toast"), /o‘zbekcha ovoz topilmadi/);
  assert.deepEqual(q.errors, []);
});

test("Anonim statistika: holat ochilganda sanaladi, sahifa footer’dan ochiladi va qulaylik talablariga mos", { skip }, async () => {
  const p = await page();
  const before = await (await fetch(base + "api/stats")).json();
  await p.goto(base);
  await p.waitForSelector(".domain");
  await p.click("[data-domain='kommunal']");
  await p.click("[data-case='kommunal_sifat']");
  await p.waitForSelector("#v2 h1");
  await p.fill("#problem", "x").catch(() => {});                  // kalkulyator/forma o‘zgarishlari sanalmaydi
  const after = await (await fetch(base + "api/stats")).json();
  assert.equal((after.byScenario.kommunal_sifat || 0) - (before.byScenario.kommunal_sifat || 0), 1);
  await p.goto(base);
  await p.click("footer a[href='/statistika']");
  await p.waitForSelector(".stattiles");
  assert.match(await p.innerText("h1"), /Anonim statistika/);
  assert.ok(await p.locator(".bars tbody tr").count() >= 12);
  assert.deepEqual(await audit(p), []);
  const m = await page({ viewport:{ width:320, height:640 } });
  await m.goto(base + "statistika?lang=ru");
  assert.equal(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual([...p.errors, ...m.errors], []);
});

test("Hujjat rasmi: panel doim ko‘rinadi, AI kalitisiz OCR o‘qiydi, muddat va ariza to‘ladi; panel yopiladi va qayta ochiladi", { skip }, async () => {
  const p = await page();
  await p.goto(base);
  assert.ok(await p.isVisible("#photoPanel"));
  assert.deepEqual(await audit(p), []);
  await p.setInputFiles("#photoIn", fileURLToPath(new URL("../fixtures/yhxx-qaror-foto.jpg", import.meta.url)));
  await p.waitForSelector("#photoCard", { timeout: 30_000 });
  const card = await p.innerText("#photoCard");
  assert.match(card, /AB 1234567/);
  assert.match(card, /375\s000/);
  assert.match(card, /IIBB Yo.l harakati/);
  assert.match(card, /01 A 123 BC/);
  assert.match(card, /bepul OCR/);
  assert.match(await p.innerText("#deadlineCard"), /Shikoyat berish uchun qoldi/i);
  assert.equal(await p.inputValue("#trigger"), "2026-11-14");
  assert.deepEqual(await audit(p), []);
  await p.click(".cta [data-go='3']");
  await p.waitForSelector("#paper .ttl");
  assert.equal(await p.inputValue("#f_decisionNumber"), "AB 1234567");
  assert.equal(await p.inputValue("#f_plate"), "01 A 123 BC");
  // Panelni yopish: qayta yuklanganda ham yopiq (server cookie bo‘yicha chizadi), kamera tugmasi qayta ochadi
  await p.goto(base + "#vaziyat");
  await p.click("#photoClose");
  assert.ok(await p.isHidden("#photoPanel"));
  await p.reload();
  assert.ok(await p.isHidden("#photoPanel"));
  await p.evaluate(() => { document.getElementById("photoIn").click = () => {}; });
  await p.click("#photoBtn");
  assert.ok(await p.isVisible("#photoPanel"));
  // Rasm bo‘lmagan fayl — tushunarli xato
  await p.setInputFiles("#photoIn", { name:"x.txt", mimeType:"text/plain", buffer: Buffer.from("salom") });
  await p.waitForSelector("#askErr:not([hidden])");
  assert.deepEqual(p.errors, []);
});
