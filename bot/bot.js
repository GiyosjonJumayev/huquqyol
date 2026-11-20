// Telegram bot (grammY). Sessiya faqat xotirada, 1 soat; foydalanuvchi matni logga yozilmaydi.
import { Bot, InlineKeyboard, InputFile } from "grammy";
import { analyzeText, chooseScenario, summaryScreen, planScreen, recipientsScreen, makeDocuments, calendarFile,
  startScreen, areaScreen, splitMessage, esc, base } from "./core.js";
import { botT } from "./i18n.js";
import { vPlan } from "../server/validate.js";
import { msg } from "../server/i18n.js";
import { LANGS } from "../public/i18n.js";

export const SESSION_TTL = 60 * 60 * 1000;
export const RATE_LIMIT = 20;            // xabar / daqiqa / chat
const RATE_WINDOW = 60 * 1000;

const keyboardOf = rows => {
  if (!rows?.length) return undefined;
  const kb = new InlineKeyboard();
  rows.forEach((row, i) => { if (i) kb.row(); row.forEach(b => kb.text(b.text, b.data)); });
  return kb;
};

export function createBot(token, { botInfo, now = () => Date.now(), today = () => new Date(), siteUrl = "" } = {}){
  const bot = new Bot(token, botInfo ? { botInfo } : undefined);
  const sessions = new Map(), hits = new Map();

  const session = id => {
    let s = sessions.get(id);
    if (s && now() - s.at > SESSION_TTL){ sessions.delete(id); s = null; }
    if (!s){ s = { lang: "uz", form: {} }; sessions.set(id, s); }
    s.at = now();
    return s;
  };
  const sweep = setInterval(() => {
    const t = now();
    for (const [id, s] of sessions) if (t - s.at > SESSION_TTL) sessions.delete(id);
    for (const [id, h] of hits) if (!h.some(x => t - x < RATE_WINDOW)) hits.delete(id);
  }, 10 * 60 * 1000);
  sweep.unref?.();

  const send = async (ctx, screen) => {
    const parts = splitMessage(screen.text);
    for (let i = 0; i < parts.length; i++)
      await ctx.reply(parts[i], { parse_mode: "HTML", link_preview_options: { is_disabled: true },
        ...(i === parts.length - 1 && screen.keyboard ? { reply_markup: keyboardOf(screen.keyboard) } : {}) });
  };
  const opts = () => ({ today: today(), siteUrl });

  // Tezlik chegarasi: har bir chat uchun daqiqasiga 20 ta xabar/bosish
  bot.use(async (ctx, next) => {
    const id = ctx.chat?.id; if (id == null) return next();
    const t = now(), h = (hits.get(id) || []).filter(x => t - x < RATE_WINDOW);
    h.push(t); hits.set(id, h);
    if (h.length > RATE_LIMIT){
      if (h.length === RATE_LIMIT + 1){ const s = session(id); await ctx.reply(botT(s.lang)("rate")); }
      if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});
      return;
    }
    return next();
  });

  // Har bir ishlovchi: xato bo‘lsa — foydalanuvchiga qisqa xabar, logga faqat xato turi
  const safe = fn => async ctx => {
    const s = session(ctx.chat.id);
    try { await fn(ctx, s); }
    catch (e) {
      if (e?.key) return void await ctx.reply(msg(s.lang, e.key, e.vars)).catch(() => {});   // foydalanuvchi xatosi (sana va h.k.)
      console.error("[bot] xatolik:", e?.name || "Error", e?.error_code || "");               // matn logga tushmaydi
      await ctx.reply(botT(s.lang)("error")).catch(() => {});
    }
  };
  const needCase = fn => safe(async (ctx, s) => {
    if (!s.scenario) return ctx.reply(botT(s.lang)("expired"));
    return fn(ctx, s);
  });

  const generate = async (ctx, s) => {
    delete s.awaiting;
    await ctx.replyWithChatAction("upload_document").catch(() => {});
    const r = await makeDocuments(s, opts());
    const [pdf, docx] = r.files;
    await ctx.replyWithDocument(new InputFile(pdf.data, pdf.name));
    await ctx.replyWithDocument(new InputFile(docx.data, docx.name), { caption: r.caption });
  };

  bot.command("start", safe(async (ctx, s) => send(ctx, startScreen(s.lang))));
  bot.command("help", safe(async (ctx, s) => send(ctx, { text: botT(s.lang)("help") })));
  bot.command("lang", safe(async (ctx, s) => { const sc = startScreen(s.lang); return send(ctx, { text: esc(botT(s.lang)("chooseLang")), keyboard: sc.keyboard }); }));
  bot.command("delete", safe(async (ctx, s) => { const lang = s.lang; sessions.delete(ctx.chat.id); return ctx.reply(botT(lang)("deleted")); }));
  bot.command("skip", needCase(async (ctx, s) => s.awaiting === "fio" ? generate(ctx, s) : send(ctx, summaryScreen(s, opts()))));
  bot.command("sana", needCase(async (ctx, s) => {
    const d = String(ctx.match || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return ctx.reply(botT(s.lang)("dateUsage"));
    vPlan({ scenario: s.scenario, triggerDate: d, lang: base(s.lang) });       // noto‘g‘ri yoki kelajakdagi sana — ValidationError
    s.triggerDate = d;
    await ctx.reply(botT(s.lang)("dateSet"));
    return send(ctx, summaryScreen(s, opts()));
  }));

  bot.callbackQuery(/^lang:(\w+)$/, safe(async (ctx, s) => {
    await ctx.answerCallbackQuery();
    const lang = ctx.match[1]; if (!LANGS.includes(lang)) return;
    s.lang = lang;
    const T = botT(lang);
    await ctx.reply(lang === "cyr" ? T("langSetCyr") : T("langSet"));
    if (s.scenario) await send(ctx, summaryScreen(s, opts()));
  }));
  bot.callbackQuery("plan", needCase(async (ctx, s) => { await ctx.answerCallbackQuery(); return send(ctx, planScreen(s, opts())); }));
  bot.callbackQuery("doc", needCase(async (ctx, s) => { await ctx.answerCallbackQuery(); return send(ctx, recipientsScreen(s, opts())); }));
  bot.callbackQuery("cal", needCase(async (ctx, s) => {
    await ctx.answerCallbackQuery();
    const r = calendarFile(s, opts());
    if (!r.file) return send(ctx, r);
    return ctx.replyWithDocument(new InputFile(r.file.data, r.file.name), { caption: r.caption });
  }));
  bot.callbackQuery(/^rcp:(\w+)$/, needCase(async (ctx, s) => {
    await ctx.answerCallbackQuery();
    s.recipient = ctx.match[1];
    s.awaiting = "fio";
    return ctx.reply(botT(s.lang)("askFio"));
  }));
  bot.callbackQuery(/^scn:(\w+)$/, safe(async (ctx, s) => { await ctx.answerCallbackQuery(); return send(ctx, chooseScenario(s, ctx.match[1], undefined, opts())); }));
  bot.callbackQuery(/^area:(\w+)$/, safe(async (ctx, s) => { await ctx.answerCallbackQuery(); return send(ctx, areaScreen(s.lang, ctx.match[1])); }));
  bot.on("callback_query:data", ctx => ctx.answerCallbackQuery());

  bot.on("message:text", safe(async (ctx, s) => {
    const text = ctx.message.text;
    if (text.startsWith("/")) return send(ctx, { text: botT(s.lang)("help") });        // noma’lum buyruq
    if (s.awaiting === "fio" && s.scenario){ s.form.fio = text.trim().slice(0, 200); return generate(ctx, s); }
    await ctx.replyWithChatAction("typing").catch(() => {});
    return send(ctx, await analyzeText(s, text, opts()));
  }));

  bot.catch(err => console.error("[bot] xatolik:", err.error?.name || "Error"));   // matn logga tushmaydi

  return { bot, sessions, stop: () => { clearInterval(sweep); return bot.stop(); } };
}
