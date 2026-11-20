// Telegram bot: haqiqiy grammY ishlovchilari, Telegram API esa soxta (tarmoq yo‘q).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createBot, RATE_LIMIT } from "../bot/bot.js";
import { splitMessage } from "../bot/core.js";

const TODAY = new Date(2026, 10, 20);
const BOT_INFO = { id: 1, is_bot: true, first_name: "HuquqYol", username: "huquqyol_test_bot",
  can_join_groups: false, can_read_all_group_messages: false, supports_inline_queries: false };

function harness({ now } = {}){
  let clock = Date.UTC(2026, 10, 20, 7);
  const { bot, sessions, stop } = createBot("123:TEST", { botInfo: BOT_INFO, today: () => TODAY, now: now || (() => clock) });
  const calls = [];
  bot.api.config.use(async (prev, method, payload) => {
    calls.push({ method, payload });
    const message = { message_id: calls.length, date: 0, chat: { id: payload.chat_id, type: "private" }, text: payload.text || "" };
    return { ok: true, result: method.startsWith("send") ? message : true };
  });
  const from = { id: 42, is_bot: false, first_name: "Aziz" }, chat = { id: 42, type: "private", first_name: "Aziz" };
  let uid = 0;
  const text = async t => {
    const cmd = /^\/\w+/.exec(t);
    await bot.handleUpdate({ update_id: ++uid, message: { message_id: uid, date: 0, chat, from, text: t,
      ...(cmd ? { entities: [{ type: "bot_command", offset: 0, length: cmd[0].length }] } : {}) } });
  };
  const press = async data => bot.handleUpdate({ update_id: ++uid, callback_query: { id: String(uid), from, chat_instance: "c",
    data, message: { message_id: 1, date: 0, chat, text: "" } } });
  const sent = () => calls.filter(c => c.method === "sendMessage");
  const last = () => sent().at(-1).payload;
  const buttons = p => (p.reply_markup?.inline_keyboard || []).flat().map(b => b.callback_data);
  const docs = () => calls.filter(c => c.method === "sendDocument");
  return { bot, sessions, stop, calls, text, press, sent, last, buttons, docs, tick: ms => { clock += ms; } };
}

test("Bot /start: salom, maxfiylik va til tugmalari", async () => {
  const h = harness();
  await h.text("/start");
  const p = h.last();
  assert.match(p.text, /HuquqYo‘l/);
  assert.match(p.text, /Matningiz saqlanmaydi/);
  assert.deepEqual(h.buttons(p), ["lang:uz", "lang:cyr", "lang:ru"]);
  h.stop();
});

test("Bot tahlil: holat, faktlar, muddat (qalin), MK 333 kompensatsiyasi va [Reja] [Ariza] [Kalendar]", async () => {
  const h = harness();
  await h.text("Ish beruvchim 3 oydan beri maosh bermayapti, qarz 9 mln so‘m");
  const p = h.last();
  assert.equal(p.parse_mode, "HTML");
  assert.match(p.text, /<b>Holat:<\/b> Ish haqi to‘lanmayapti|<b>Holat:<\/b> /);
  assert.match(p.text, /summa 9\s000\s000 so‘m, 3 oy/);
  assert.match(p.text, /<b>Muddat: 92 kun qoldi<\/b>/);                   // 2026-08-20 + 6 oy = 2027-02-20
  assert.match(p.text, /<b>7\s728\s000 so‘m<\/b>/);                       // buildPlan → MK 333 (matn bo‘yicha)
  assert.match(p.text, /Bu yo‘l xaritasi, yuridik maslahat emas\./);
  assert.deepEqual(h.buttons(p).slice(0, 3), ["plan", "doc", "cal"]);
  assert.equal(h.sessions.get(42).scenario, "ish_haqi");
  h.stop();
});

test("Bot reja: raqamlangan qadamlar, sud muddati, lex.uz havolalari (4 tagacha), idora", async () => {
  const h = harness();
  await h.text("Ish beruvchim 3 oydan beri maosh bermayapti, qarz 9 mln so‘m");
  await h.press("plan");
  const p = h.last();
  assert.match(p.text, /^<b>Reja: /);
  assert.match(p.text, /\n1\. <b>.+<\/b> — /);
  assert.match(p.text, /<b>Sudga murojaat uchun qoldi: 92 kun<\/b>/);
  const links = p.text.match(/<a href="https:\/\/lex\.uz[^"]*">/g) || [];
  assert.ok(links.length >= 1 && links.length <= 4, String(links.length));
  assert.match(p.text, /☎️|🔗/);
  assert.deepEqual(h.buttons(p), ["cal", "doc"]);
  assert.ok(h.calls.some(c => c.method === "answerCallbackQuery"));
  h.stop();
});

test("Bot ariza: oluvchi tugmalari → F.I.Sh. → PDF va DOCX, izohda «Imzolab topshiring» va bo‘sh joylar", async () => {
  const h = harness();
  await h.text("Ish beruvchim 3 oydan beri maosh bermayapti, qarz 9 mln so‘m");
  await h.press("doc");
  assert.deepEqual(h.buttons(h.last()).filter(b => b.startsWith("rcp:")).length > 1, true);
  await h.press("rcp:court");
  assert.match(h.last().text, /F\.I\.Sh\.ingizni yozing/);
  await h.text("Karimov Aziz Botirovich");
  const d = h.docs();
  assert.equal(d.length, 2);
  assert.match(d[0].payload.document.filename, /^HuquqYol-ish_haqi-court\.pdf$/);
  assert.match(d[1].payload.document.filename, /^HuquqYol-ish_haqi-court\.docx$/);
  assert.match(d[1].payload.caption, /Imzolab topshiring\./);
  assert.match(d[1].payload.caption, /my\.sud\.uz/);
  assert.match(d[1].payload.caption, /\[ \] bilan belgilangan \(\d+ ta\)/);
  assert.equal(h.sessions.get(42).form.fio, "Karimov Aziz Botirovich");
  // /skip — F.I.Sh. so‘ralmasdan
  await h.press("rcp:employer");
  await h.text("/skip");
  assert.equal(h.docs().length, 4);
  assert.match(h.docs()[3].payload.caption, /Ikki nusxada/);
  h.stop();
});

test("Bot kalendar: .ics — oxirgi kun va 3 kun oldin eslatma; muddatsiz holatda xabar", async () => {
  const h = harness();
  await h.text("Ish beruvchim 3 oydan beri maosh bermayapti, qarz 9 mln so‘m");
  await h.press("cal");
  const f = h.docs()[0].payload.document;
  assert.equal(f.filename, "HuquqYol-ish_haqi-2027-02-20.ics");
  const ics = Buffer.from(await f.toRaw()).toString("utf8");
  assert.match(ics, /^BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART;VALUE=DATE:20270220/);
  assert.match(ics, /DTSTART;VALUE=DATE:20270217/);
  assert.match(ics, /SUMMARY:Oxirgi kun: /);
  assert.match(ics, /TRIGGER:-PT15H/);
  await h.press("scn:ijara_chiqarish");
  await h.press("cal");
  assert.match(h.last().text, /qat’iy muddat yo‘q/);
  h.stop();
});

test("Bot «boshqa»: bazada yo‘q — murojaat.gov.uz, yurxizmat.uz va sohalar → holat", async () => {
  const h = harness();
  await h.text("Соседская собака укусила меня");
  const p = h.last();
  assert.match(p.text, /murojaat\.gov\.uz/);
  assert.match(p.text, /yurxizmat\.uz/);
  const areas = h.buttons(p).filter(b => b.startsWith("area:"));
  assert.equal(areas.length, 12);
  await h.press("area:mehnat");
  assert.ok(h.buttons(h.last()).includes("scn:ish_haqi"));
  await h.press("scn:ish_haqi");
  assert.match(h.last().text, /Muddat: \d+ kun qoldi/);
  h.stop();
});

test("Bot ishonch past bo‘lsa — 2 tagacha muqobil holat tugmasi", async () => {
  const h = harness();
  await h.text("Hokimlikka ariza yozmoqchiman, mahallamizdagi yo‘l buzilgan");
  const b = h.buttons(h.last());
  assert.ok(b.includes("scn:murojaat_javobsiz"), b.join(","));
  assert.ok(b.filter(x => x.startsWith("scn:")).length <= 2);
  h.stop();
});

test("Bot rus tilida: til tugmasi → tahlil, reja va ariza ruscha", async () => {
  const h = harness();
  await h.press("lang:ru");
  assert.match(h.last().text, /Язык: русский/);
  await h.text("Работодатель 3 месяца не платит зарплату, долг 9 млн сум");
  const p = h.last();
  assert.match(p.text, /<b>Ситуация:<\/b> /);
  assert.match(p.text, /<b>Срок: осталось 92 дн\.<\/b>/);
  assert.match(p.text, /Это дорожная карта, а не юридическая консультация\./);
  assert.equal(p.reply_markup.inline_keyboard[0][0].text, "📋 План");
  await h.press("rcp:employer");
  await h.text("/skip");
  assert.match(h.docs().at(-1).payload.caption, /Подпишите и подайте\./);
  h.stop();
});

test("Bot kirillcha: matn kirillda, buyruqlar va havolalar o‘zgarmaydi", async () => {
  const h = harness();
  await h.press("lang:cyr");
  await h.text("Ish beruvchim 3 oydan beri maosh bermayapti, qarz 9 mln so‘m");
  const p = h.last();
  assert.match(p.text, /<b>Ҳолат:<\/b> /);
  assert.match(p.text, /<b>Муддат: 92 кун қолди<\/b>/);
  assert.match(p.text, /\/sana YYYY-MM-DD/);
  assert.ok(!/<б>|<\/б>/.test(p.text));
  h.stop();
});

test("Bot /sana: hisob sanasini o‘zgartiradi; kelajakdagi sana rad etiladi", async () => {
  const h = harness();
  await h.text("Ish beruvchim 3 oydan beri maosh bermayapti, qarz 9 mln so‘m");
  await h.text("/sana 2026-10-20");
  assert.match(h.last().text, /Muddat: 151 kun qoldi/);                 // 2026-10-20 + 6 oy = 2027-04-20; 2026-11-20 dan 151 kun
  await h.text("/sana 2099-01-01");
  assert.match(h.last().text, /kelajakda bo‘lishi mumkin emas/);
  assert.equal(h.sessions.get(42).triggerDate, "2026-10-20");
  h.stop();
});

test("Bot /delete va 1 soatlik sessiya; tezlik chegarasi 20/daqiqa", async () => {
  const h = harness();
  await h.text("Ish beruvchim 3 oydan beri maosh bermayapti");
  await h.text("/delete");
  assert.match(h.last().text, /o‘chirildi/);
  assert.equal(h.sessions.has(42), false);
  await h.press("plan");
  assert.match(h.last().text, /eskirgan yoki o‘chirilgan/);

  await h.text("Ish beruvchim 3 oydan beri maosh bermayapti");
  h.tick(61 * 60 * 1000);
  await h.press("plan");
  assert.match(h.last().text, /eskirgan yoki o‘chirilgan/);

  const r = harness();
  for (let i = 0; i < RATE_LIMIT + 5; i++) await r.text("/help");
  const replies = r.sent().map(c => c.payload.text);
  assert.equal(replies.length, RATE_LIMIT + 1);
  assert.match(replies.at(-1), /Juda ko‘p xabar/);
  h.stop(); r.stop();
});

test("Bot: uzun matn 4096 belgidan oshmaydigan bo‘laklarga bo‘linadi", () => {
  const long = Array.from({ length: 300 }, (_, i) => `${i + 1}. ${"x".repeat(40)}`).join("\n");
  const parts = splitMessage(long);
  assert.ok(parts.length > 1 && parts.every(p => p.length <= 4000));
  assert.equal(parts.join("\n"), long);
  assert.ok(splitMessage("y".repeat(9000)).every(p => p.length <= 4000));
});

test("Bot tokensiz ishga tushmaydi va aniq xabar beradi", () => {
  let err;
  try { execFileSync(process.execPath, ["bot/index.js"], { env: { ...process.env, TELEGRAM_BOT_TOKEN: "" }, encoding: "utf8", stdio: "pipe" }); }
  catch (e) { err = e; }
  assert.ok(err, "chiqish kodi 0 bo‘lmasligi kerak");
  assert.equal(err.status, 1);
  assert.match(err.stderr, /TELEGRAM_BOT_TOKEN topilmadi/);
  assert.match(err.stderr, /BotFather/);
});
