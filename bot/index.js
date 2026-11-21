// HuquqYo‘l Telegram boti: npm run bot  (long polling, alohida jarayon)
import "./env.js";                                   // birinchi: .env va TZ (analyze.js kalitni yuklanishda o‘qiydi)

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token){
  console.error([
    "TELEGRAM_BOT_TOKEN topilmadi — bot ishga tushmadi.",
    "1) Telegram’da @BotFather ga /newbot yozing va token oling.",
    "2) .env fayliga qo‘shing: TELEGRAM_BOT_TOKEN=123456:ABC...",
    "3) Qayta ishga tushiring: npm run bot"
  ].join("\n"));
  process.exit(1);
}

const { createBot } = await import("./bot.js");
const { aiEnabled, aiProvider } = await import("../server/analyze.js");
const site = process.env.PUBLIC_HOST ? `https://${process.env.PUBLIC_HOST}` : "";
const { bot, stop } = createBot(token, { siteUrl: site });

await bot.api.setMyCommands([
  { command: "start", description: "Boshlash / Начать" },
  { command: "help", description: "Yordam / Помощь" },
  { command: "lang", description: "Til / Язык" },
  { command: "delete", description: "Ma’lumotni o‘chirish / Удалить данные" }
]).catch(() => {});

for (const sig of ["SIGINT", "SIGTERM"]) process.once(sig, () => { stop(); });
await bot.start({ drop_pending_updates: true,
  onStart: me => console.log(`HuquqYo‘l bot ishga tushdi: @${me.username}  (AI: ${aiEnabled() ? aiProvider() : "o‘chiq — qidiruv rejimi"})`) });
