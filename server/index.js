import express from "express";
import compression from "compression";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { SCENARIOS, NORMS, LEX_URL, kbFor, COURTS } from "./kb.js";
import { analyze, aiEnabled, aiProvider, aiLastError } from "./analyze.js";
import { buildPlan, CB_RATE } from "./plan.js";
import { documentModel, customModel, toDocx, toPdf } from "./documents.js";
import { plansPage, lawyersPage, lawyerPage, cabinetPage, privacyPage, vLawyerApply, saveApplication, vCustom } from "./business.js";
import { initDb, migrate, dbEnabled } from "./db.js";
import { attachUser, register, login, logout, changePassword } from "./auth.js";
import { accessMiddleware, HOME, navFor, roleOf } from "./access.js";
import { approvedLawyers, recordView, applyToDb, requestConsultation, actConsultation, consultationsFor, adminAct, adminStats, photoQueue, platformStats, caseFor } from "./market.js";
import { casePage } from "./casePage.js";
import { audit } from "./billing.js";
import { regionOfForm, REGIONS } from "./regions.js";
import { loginPage, registerPage, accountPage, adminPage, applyPage, forbiddenPage } from "./accountPages.js";
import { proStatus, myProfile, saveProfile, saveAreas, savePhoto, sendPhoto, getCabinet, putCabinet, lawyerStats } from "./lawyer.js";
import { getPractice, practiceCounts, customActs } from "./practice.js";
import { subscribe, mySubscriptions, myPayments, getPayment, paymentStatus, cancelOrder, bankTransfer } from "./billing.js";
import { paymeWebhook, clickWebhook } from "./payGateways.js";
import { resendVerify, confirmEmail, forgot, resetPassword, totpStart, totpEnable, totpDisable, sessionsOf, endSession, exportData, deleteAccount, peekToken } from "./account.js";
import { invite, cancelInvite, acceptInvite, removeMember, teamInfo, inviteView, getTeamCabinet, putTeamCabinet } from "./team.js";
import { checkoutPage, paymentsPage, invoicePdf, securityPage, forgotPage, resetPage, confirmPage, teamPage, invitePage, offerPage } from "./payPages.js";
import { startJobs, stopJobs } from "./jobs.js";
import { one, q } from "./db.js";
import { lawyerPanel, profileEditPage, lawyerStatsPage } from "./lawyerPages.js";

// PostgreSQL (DATABASE_URL bo‘lsa): hisoblar, obunalar, kelishuvlar. Migratsiyalar start() da qo‘llanadi.
initDb();
import { securityHeaders, requireJson, rateLimit, sameOrigin, httpsRedirect } from "./security.js";
import { vAnalyze, vPlan, vDocument } from "./validate.js";
import { cyrillicModel } from "../public/translit.js";
import { domainCardsHTML, examplesHTML, siteNav, siteFooter, a11yDialogHTML } from "../public/shared.js";
import { makeT, LANGS, HTML_LANG } from "../public/i18n.js";
import { resolveLang, parseLang, deepCyr, msg, LANG_COOKIE } from "./i18n.js";
import { stats, DEFAULT_FILE as STATS_FILE, PERIODS } from "./stats.js";
import { statsPage } from "./statsPage.js";
import { vPhoto, readPhoto } from "./photo.js";
import { warmUp as ocrWarmUp, shutdown as ocrShutdown, ocrEnabled } from "./ocr.js";

// Til: uz va ru o‘z bazasidan, cyr — uz natijasining kirill shakli
const base = lang => lang === "ru" ? "ru" : "uz";
const out = (lang, x) => lang === "cyr" ? deepCyr(x) : x;
const buildModel = req => { const v = vDocument(req.body); const m = documentModel({ ...v, lang: base(v.lang) }); return v.lang === "cyr" ? cyrillicModel(m) : m; };

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const fontDir = pkg => join(dirname(require.resolve(`${pkg}/package.json`)), "files");
const PDFJS_DIR = dirname(require.resolve("pdfjs-dist/package.json"));
export const PDFJS_BASE = `/vendor/pdfjs-${require("pdfjs-dist/package.json").version}`;

export const app = express();
app.disable("x-powered-by");
// Proxy (Nginx, Apache/Passenger, Render) ortida: TRUST_PROXY=1 — haqiqiy IP va HTTPS ni X-Forwarded-* dan olish
{ const tp = (process.env.TRUST_PROXY || "").trim();
  if (tp) app.set("trust proxy", tp === "true" ? 1 : /^\d+$/.test(tp) ? Number(tp) : tp); }
app.use(compression());
app.use(httpsRedirect);
app.use(securityHeaders);
// Hujjat rasmi: alohida, kattaroq tana chegarasi (brauzer rasmni ~1600 px gacha kichraytirib yuboradi).
// Umumiy /api chegarasi (32 KB) undan keyin ulanadi, shuning uchun bu marshrut undan oldin turadi.
const apiLimit = rateLimit({ max: 600, name:"api" });
// Tanlangan mavzu (cookie) — sahifa chizilishidan oldin <html data-theme="…"> sifatida (ekran «miltillamaydi»)
const themeOf = req => /(?:^|;\s*)hy_theme=(light|dark)(?:;|$)/.exec(req.headers.cookie || "")?.[1] || "";
const withTheme = (req, html) => { const th = themeOf(req); return th ? html.replace("<html", `<html data-theme="${th}"`) : html; };
// Kirish huquqlari (server/access.js): noto‘g‘ri rol — do‘stona 403 sahifa, rolning o‘z sahifasiga havola bilan
const guard = accessMiddleware({ proStatus, forbidden: (req, res, reason) => {
  const fs = /(?:^|;\s*)hy_fs=([1-3])(?:;|$)/.exec(req.headers.cookie || "")?.[1];
  res.status(403).set({ "Cache-Control": "private, no-store", "Vary": "Cookie" }).type("html").send(withTheme(req, forbiddenPage({ lang: req.lang, fs, user: req.user, reason,
    cssHref: `/app.css?v=${VER["app.css"]}`, accHref: `/account.js?v=${VER["account.js"]}`, home: HOME[roleOf(req.user)] })));
} });
const wrapEarly = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
app.post("/api/photo", apiLimit, rateLimit({ max: 8, name:"photo" }), sameOrigin, requireJson, express.json({ limit: "8mb", strict: true }),
  (req, res, next) => { req.lang = resolveLang(req); next(); },
  wrapEarly(async (req, res) => {
    const v = vPhoto(req.body);
    const r = await readPhoto(v, base(req.lang));
    stats.record("analyze", { scenario: r.scenario, ip: req.ip });
    stats.record("photo", { scenario: r.scenario, ip: req.ip });     // hujjat rasmi/PDF o‘qildi (faqat sanoq)
    res.json(out(req.lang, r));
  }));
// Yurist rasmi va kabinet ma’lumotlari: kattaroq tana (rasm brauzerda 480 px ga kichraytiriladi)
const langUser = [(req, res, next) => { req.lang = resolveLang(req); next(); }, attachUser, guard,
  (req, res, next) => dbEnabled() ? next() : res.status(503).json({ error: msg(req.lang, "dbOff") })];
// To‘lov tizimlari serverlari: brauzer emas — Origin/JSON talabi yo‘q, o‘z imzosi bilan tekshiriladi (payGateways.js). Umumiy /api qatlamidan oldin.
const payLimit = rateLimit({ max: 600, name:"pay" });
const payDb = (req, res, next) => dbEnabled() ? next() : res.status(503).json({ error: "db" });
app.post("/api/pay/payme", payLimit, payDb, express.text({ type: () => true, limit: "32kb" }), (req, res, next) => paymeWebhook(req, res).catch(next));
for (const [step, complete] of [["prepare", false], ["complete", true]])
  app.post(`/api/pay/click/${step}`, payLimit, payDb, express.urlencoded({ extended: false, limit: "16kb", parameterLimit: 40 }), (req, res, next) => clickWebhook(complete)(req, res).catch(next));
app.post("/api/lawyer/photo", apiLimit, rateLimit({ max: 20, name:"lphoto" }), sameOrigin, requireJson, express.json({ limit: "800kb", strict: true }), ...langUser, wrapEarly(savePhoto));
app.post("/api/cabinet", apiLimit, rateLimit({ max: 120, name:"cab" }), sameOrigin, requireJson, express.json({ limit: "1mb", strict: true }), ...langUser, wrapEarly(putCabinet));
app.post("/api/team/cabinet", apiLimit, rateLimit({ max: 120, name:"tcab" }), sameOrigin, requireJson, express.json({ limit: "1mb", strict: true }), ...langUser, wrapEarly(putTeamCabinet));
app.use("/api", apiLimit, sameOrigin, requireJson, express.json({ limit: "32kb", strict: true }));
app.use((req, res, next) => { req.lang = resolveLang(req); next(); });
app.use(attachUser);
app.use(guard);                       // kirish huquqlari: server/access.js (barcha sahifa va /api yo‘llari)

// Fayl nomi: faqat xavfsiz belgilar (sarlavhaga in’ektsiya bo‘lmasligi uchun)
const safeName = s => String(s).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

// Sudlar ro‘yxati (tuman → sud): ariza bo‘limi ochilganda bir marta yuklanadi; o‘zgarmas ma’lumot
const COURTS_JSON = JSON.stringify(COURTS), COURTS_ETAG = `"${createHash("sha1").update(COURTS_JSON).digest("base64url").slice(0, 16)}"`;
app.get("/api/courts", (req, res) => {
  res.set({ "Cache-Control": "public, max-age=86400", ETag: COURTS_ETAG });
  if (req.get("If-None-Match") === COURTS_ETAG) return res.status(304).end();
  res.type("json").send(COURTS_JSON);
});
// Tayyorlik: baza ham javob beradimi (balanslovchi va monitoring uchun)
app.get("/api/ready", wrap(async (req, res) => {
  if (!dbEnabled()) return res.status(503).json({ ok: false, db: false });
  try { await one("select 1 as ok"); res.json({ ok: true, db: true }); } catch { res.status(503).json({ ok: false, db: false }); }
}));
app.get("/api/health", (req, res) => res.json({ ok:true, ai: aiEnabled(), aiProvider: aiProvider(), aiLastError: aiLastError(), ocr: ocrEnabled(), norms: NORMS.length, scenarios: SCENARIOS.length }));

// Ommaviy spetsifikatsiya: shablon matnlari va kalit so‘zlar yuborilmaydi
function metaOf(lang){
  const { DOMAINS, LAWS, APPLICANT_FIELDS, SCENARIOS } = kbFor(base(lang));
  return out(lang, {
    lang, cbRate: CB_RATE, lex: LEX_URL, domains: DOMAINS, applicant: APPLICANT_FIELDS,
    laws: Object.fromEntries(Object.entries(LAWS).map(([k, l]) => [k, { name:l.name, url:l.url }])),
    scenarios: SCENARIOS.map(s => ({
      id:s.id, domain:s.domain, title:s.title, card:s.card, short:s.short, trigger:s.trigger,
      docs: s.docs.map(d => ({ id:d.id, label:d.label, howto:d.howto, office:d.office || null })), fields: s.fields, calc: s.calc?.type || null, deadline: s.deadline,
      court: s.court || null, whereTo: s.whereTo || null
    }))
  });
}
const META = Object.fromEntries(LANGS.map(l => [l, metaOf(l)]));
app.get("/api/meta", (req, res) => res.set("Vary", "Cookie, Accept-Language").json({ ai: aiEnabled(), aiProvider: aiProvider(), ...META[req.lang] }));

app.post("/api/analyze", rateLimit({ max: 15, name:"analyze" }), wrap(async (req, res) => {
  const v = vAnalyze(req.body);
  const r = await analyze(v.text, base(req.lang));
  stats.record("analyze", { scenario: r.scenario, ip: req.ip });          // faqat natija holati; matn sanalmaydi ham, saqlanmaydi ham
  res.json(out(req.lang, r));
}));

app.post("/api/plan", rateLimit({ max: 120, name:"plan" }), (req, res) => {
  const v = vPlan(req.body);
  const p = buildPlan({ ...v, lang: base(v.lang) });
  if (req.body?.open === true) stats.record("open", { scenario: p.scenario, domain: p.info.domain, ip: req.ip });   // reja birinchi ochilganda
  res.json(out(req.lang, p));
});

app.post("/api/document/preview", rateLimit({ max: 240, name:"preview" }), (req, res) => res.json(buildModel(req)));

app.post("/api/document/:format", rateLimit({ max: 30, name:"file" }), wrap(async (req, res) => {
  const fmt = req.params.format;
  if (fmt !== "docx" && fmt !== "pdf") return res.status(404).json({ error: msg(req.lang, "format") });
  const model = buildModel(req);
  const buf = fmt === "docx" ? await toDocx(model) : await toPdf(model);
  // Hudud — formadagi tuman/manzildan faqat viloyat nomi; manzilning o‘zi sanalmaydi ham, saqlanmaydi ham
  stats.record("doc", { scenario: model.scenario, domain: SCEN_DOMAIN[model.scenario], region: regionOfForm(req.body?.form), ip: req.ip });
  res.set({
    "Content-Type": fmt === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf",
    "Content-Disposition": `attachment; filename="${safeName(`HuquqYol-${model.scenario}-${model.recipient}.${fmt}`)}"`
  }).send(buf);
}));

// Yurist Pro: o‘z shabloni (erkin matn) blankada — DOCX/PDF. Matn saqlanmaydi va sanalmaydi.
app.post("/api/custom/:format", rateLimit({ max: 30, name:"custom" }), wrap(async (req, res) => {
  const fmt = req.params.format;
  if (fmt !== "docx" && fmt !== "pdf") return res.status(404).json({ error: msg(req.lang, "format") });
  const v = vCustom(req.body), l = base(parseLang(req.body?.lang) || req.lang);
  const model = customModel({ ...v, lang: l });
  const out = parseLang(req.body?.lang) === "cyr" ? cyrillicModel(model) : model;
  const buf = fmt === "docx" ? await toDocx(out) : await toPdf(out);
  res.set({
    "Content-Type": fmt === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf",
    "Content-Disposition": `attachment; filename="${safeName(`HuquqYol-shablon.${fmt}`)}"`
  }).send(buf);
}));

// Yuristning katalogga qo‘shilish arizasi: moderatsiya uchun faylga yoziladi (litsenziya tekshirilgach e’lon qilinadi)
app.post("/api/lawyers/apply", rateLimit({ max: 5, name:"apply" }), wrap(async (req, res) => {
  const v = vLawyerApply(req.body);
  if (dbEnabled()) await applyToDb(v, req.user); else saveApplication(v);
  res.status(201).json({ ok: true });
}));

// ---------- Hisoblar (PostgreSQL) ----------
// Navbar uchun: kim kirgan (bosh sahifa keshlanadi — hisob holati shu orqali olinadi)
app.get("/api/me", (req, res) => res.set("Cache-Control", "private, no-store").json({ user: req.user ? { name: req.user.name, role: req.user.role } : null, nav: navFor(roleOf(req.user)) }));
const needDb = (req, res, next) => dbEnabled() ? next() : res.status(503).json({ error: msg(req.lang, "dbOff") });
const authLimit = rateLimit({ max: Number(process.env.AUTH_RATE || 10), name:"auth" });
app.post("/api/auth/register", needDb, authLimit, wrap(register));
app.post("/api/auth/login", needDb, authLimit, wrap(login));
app.post("/api/auth/logout", wrap(logout));
app.post("/api/auth/password", needDb, authLimit, wrap(changePassword));
app.post("/api/auth/forgot", needDb, rateLimit({ max: 5, windowMs: 10 * 60_000, name:"forgot" }), wrap(forgot));
app.post("/api/auth/reset", needDb, authLimit, wrap(resetPassword));
app.post("/api/auth/confirm", needDb, authLimit, wrap(confirmEmail));
app.post("/api/auth/verify", needDb, rateLimit({ max: 3, windowMs: 10 * 60_000, name:"verify" }), wrap(resendVerify));
app.post("/api/auth/2fa/start", needDb, authLimit, wrap(totpStart));
app.post("/api/auth/2fa/enable", needDb, authLimit, wrap(totpEnable));
app.post("/api/auth/2fa/disable", needDb, authLimit, wrap(totpDisable));
app.post("/api/auth/sessions/:ref/end", needDb, wrap(endSession));
app.post("/api/account/delete", needDb, authLimit, wrap(deleteAccount));
// To‘lovlar va jamoa
app.get("/api/payments/:id", needDb, rateLimit({ max: 120, name:"paystat" }), wrap(paymentStatus));
app.post("/api/payments/:id/cancel", needDb, wrap(cancelOrder));
app.post("/api/team/invite", needDb, rateLimit({ max: Number(process.env.AUTH_RATE || 10) * 2, name:"invite" }), wrap(invite));
app.post("/api/team/invite/:ref/cancel", needDb, wrap(cancelInvite));
app.post("/api/team/accept", needDb, wrap(acceptInvite));
app.post("/api/team/members/:id/remove", needDb, wrap(removeMember));
app.get("/api/team/cabinet", needDb, wrap(getTeamCabinet));
// Obuna va kelishuvlar
app.post("/api/subscriptions", needDb, rateLimit({ max: Number(process.env.AUTH_RATE || 10) * 2, name:"sub" }), wrap(subscribe));
app.post("/api/consultations", needDb, rateLimit({ max: 10, name:"cons" }), wrap(requestConsultation));
app.post("/api/consultations/:id/:act", needDb, rateLimit({ max: 60, name:"consact" }), wrap(actConsultation));
// Admin amallari
app.post("/api/admin/:kind/:id/:act", needDb, wrap(adminAct));
// Yurist profili va Pro kabineti
app.post("/api/lawyer/profile", needDb, rateLimit({ max: 30, name:"lprof" }), wrap(saveProfile));
app.post("/api/lawyer/areas", needDb, rateLimit({ max: 60, name:"lareas" }), wrap(saveAreas));
app.get("/api/practice", needDb, wrap(getPractice));
app.get("/api/cabinet", needDb, wrap(getCabinet));

// Anonim statistika: faqat yig‘ma sanoqlar (holat → soha)
const SCEN_DOMAIN = Object.fromEntries(SCENARIOS.map(s => [s.id, s.domain]));
const periodOf = q => PERIODS.includes(Number(q?.davr)) ? Number(q.davr) : 30;
app.get("/api/stats", (req, res) => res.json({ ...stats.summary({ scenarioDomain: SCEN_DOMAIN }), report: stats.report({ scenarioDomain: SCEN_DOMAIN, period: periodOf(req.query) }) }));
// Davr ma’lumoti CSV: sohalar, hududlar, holatlar va dinamika (Excel’da ochiladi: UTF-8 BOM, nuqtali vergul emas — vergul)
app.get("/api/stats.csv", (req, res) => {
  const r = stats.report({ scenarioDomain: SCEN_DOMAIN, period: periodOf(req.query) }), c = r.current, p = r.previous;
  const cell = v => /[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const rows = [["bo‘lim", "kalit", "nom", "joriy davr", "oldingi davr"]];
  const kb = kbFor("uz");
  for (const k of ["users", "opens", "docs", "lawyer", "photo", "analyzed", "outOfScope"]) rows.push(["jami", k, k, c[k], p[k]]);
  for (const d of kb.DOMAINS) rows.push(["soha", d.id, d.title, c.byDomain[d.id] || 0, p.byDomain[d.id] || 0]);
  for (const d of kb.DOMAINS) rows.push(["soha_hujjat", d.id, d.title, c.docsByDomain[d.id] || 0, p.docsByDomain[d.id] || 0]);
  for (const g of REGIONS) rows.push(["hudud_hujjat", g.id, g.name, c.byRegion[g.id] || 0, p.byRegion[g.id] || 0]);
  for (const s of kb.SCENARIOS) rows.push(["holat", s.id, s.title, c.byScenario[s.id] || 0, p.byScenario[s.id] || 0]);
  for (const x of r.series) rows.push(["dinamika", `${x.from}..${x.to}`, "murojaatlar/hujjatlar/foydalanuvchilar", x.opens, `${x.docs}/${x.users}`]);
  res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="huquqyol-statistika-${r.from}-${r.to}.csv"`, "Cache-Control": "no-store" })
    .send("\ufeff" + rows.map(x => x.map(cell).join(",")).join("\r\n") + "\r\n");
});

app.use("/api", (req, res) => res.status(404).json({ error: msg(req.lang, "notFound") }));

// ---------- Statik fayllar ----------
// Fayl nomiga kontent xeshi (?v=...) qo‘shiladi: brauzer faylni bir yil keshlaydi, yangi versiyada URL o‘zgaradi.
const PUBLIC = join(here, "..", "public");
const hashOf = f => createHash("sha256").update(readFileSync(join(PUBLIC, f))).digest("hex").slice(0, 10);
const ASSETS = ["app.css", "boot.js", "app.js", "shared.js", "translit.js", "i18n.js", "a11y.js", "session.js", "courts.js", "kabinet.js", "practice.js", "cropper.js", "account.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png"];
const MODULES = ["app.js", "shared.js", "translit.js", "i18n.js", "a11y.js", "session.js", "courts.js", "kabinet.js", "practice.js", "cropper.js", "account.js"];
const VER = Object.fromEntries(ASSETS.map(f => [f, hashOf(f)]));
// Service worker keshi har yangi relizda avtomatik almashadi: versiya — barcha resurslar xeshidan
const BUILD = createHash("sha256").update(Object.values(VER).join("") + hashOf("index.html")).digest("hex").slice(0, 12);
const SW = readFileSync(join(PUBLIC, "sw.js"), "utf8").replace("__BUILD__", BUILD);
app.get("/sw.js", (req, res) => res.set({ "Cache-Control":"no-cache", "Service-Worker-Allowed":"/" }).type("js").send(SW));
const versioned = (html, list) => list.reduce((h, f) => h.replaceAll(`"/${f}"`, `"/${f}?v=${VER[f]}"`), html);

// Bosh sahifa serverda oldindan chiziladi (har bir til uchun alohida): matnlar, soha kartalari, namunalar va meta HTML ichida keladi.
// Shablondagi {{kalit}} — public/i18n.js lug‘atidan.
const jsonForHtml = o => JSON.stringify(o).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, "");
const escAttr = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const TEMPLATE = versioned(readFileSync(join(PUBLIC, "index.html"), "utf8"), ASSETS);
// Ijtimoiy tarmoqlar (Telegram, Facebook) uchun to‘liq URL: PUBLIC_HOST berilgan bo‘lsa
const OG_BASE = /^[a-z0-9.-]+(?::\d+)?$/i.test(process.env.PUBLIC_HOST || "") ? `https://${process.env.PUBLIC_HOST}` : "";
const OG_LOCALE = { uz:"uz_UZ", cyr:"uz_UZ", ru:"ru_RU" };
function renderIndex(lang){
  const t = makeT(lang), meta = { ai: aiEnabled(), aiProvider: aiProvider(), ...META[lang] };
  const pName = meta.aiProvider === "gemini" ? "Google (Gemini)" : "Anthropic (Claude)";
  return TEMPLATE
    .replace("{{ogBase}}", OG_BASE).replace("{{ogLocale}}", OG_LOCALE[lang])
    .replace("{{ogUrl}}", OG_BASE ? `
<meta property="og:url" content="${OG_BASE}/?lang=${lang}">` : "")
    .replace("<!--NAV-->", siteNav({ lang, t, mode: "app", path: "/", a11y: true }))
    .replace("<!--FOOTER-->", siteFooter(t, { mode: "app", path: "/", botUrl: process.env.TELEGRAM_BOT_URL }))
    .replace("<!--A11Y-->", a11yDialogHTML(t))
    .replace("<!--DOMAINS-->", domainCardsHTML(meta, t))
    .replace("<!--EXAMPLES-->", examplesHTML(lang))
    .replace("<!--META-->", `<script type="application/json" id="meta-data">${jsonForHtml(meta)}</script>`)
    .replace(`data-lang="${lang}" aria-pressed="false"`, `data-lang="${lang}" aria-pressed="true"`)
    .replace(/\{\{(\w+)\}\}/g, (_, k) => k === "htmlLang" ? HTML_LANG[lang] : k === "pdfjsBase" ? PDFJS_BASE : k === "lang" ? lang : k === "aiText" ? escAttr(t(meta.ai ? "aiOn" : "aiOff", { p: meta.aiProvider === "gemini" ? "Gemini" : "Claude" })) : k === "privacy" ? escAttr(t(!meta.ai ? "privacy" : meta.aiProvider === "gemini" ? "privacyAiG" : "privacyAi")) : k === "freeLine" ? escAttr(meta.ai ? t("freeLineAi", { p: pName }) : t("freeLine")) : k === "faq2a" ? escAttr(meta.ai ? t("faq2aAi", { p: pName }) : t("faq2a"))
      : k === "allSituations" ? escAttr(t("allSituations", { d: meta.domains.length, s: SCENARIOS.length })) : escAttr(t(k)));
}
const INDEX = Object.fromEntries(LANGS.map(l => [l, renderIndex(l)]));
app.get(["/", "/index.html"], (req, res) => {
  const forced = parseLang(req.query.lang);
  if (forced) res.cookie(LANG_COOKIE, forced, { maxAge: 365 * 864e5, sameSite:"lax", path:"/" });   // ?lang=ru havolasi tilni eslab qoladi
  // Tanlangan shrift o‘lchami (cookie) sahifa chizilishidan oldin qo‘llanadi — matn «sakramaydi»
  const fs = /(?:^|;\s*)hy_fs=([1-3])(?:;|$)/.exec(req.headers.cookie || "")?.[1];
  let html = fs ? INDEX[req.lang].replace("<html ", `<html data-fs="${fs}" `) : INDEX[req.lang];
  // Foydalanuvchi rasm panelini yopgan bo‘lsa (cookie), sahifa shu holatda chiziladi — panel «miltillamaydi»
  if (/(?:^|;\s*)hy_photo=1(?:;|$)/.test(req.headers.cookie || "")) html = html.replace('aria-labelledby="photoPanelT" hidden>', 'aria-labelledby="photoPanelT">');
  res.set({ "Cache-Control":"no-cache", "Vary":"Cookie, Accept-Language", "Content-Language": HTML_LANG[req.lang] }).type("html").send(withTheme(req, html));
});
app.get("/statistika", wrap(async (req, res) => {
  const forced = parseLang(req.query.lang);
  if (forced) res.cookie(LANG_COOKIE, forced, { maxAge: 365 * 864e5, sameSite:"lax", path:"/" });
  const fs = /(?:^|;\s*)hy_fs=([1-3])(?:;|$)/.exec(req.headers.cookie || "")?.[1];
  res.set({ "Cache-Control":"no-cache", "Vary":"Cookie, Accept-Language", "Content-Language": HTML_LANG[req.lang] }).type("html")
    .send(withTheme(req, statsPage({ lang: req.lang, s: stats.summary({ scenarioDomain: SCEN_DOMAIN }), r: stats.report({ scenarioDomain: SCEN_DOMAIN, period: periodOf(req.query) }),
      plat: await platformStats(periodOf(req.query)), cssHref: `/app.css?v=${VER["app.css"]}`, fs, user: req.user, accHref: `/account.js?v=${VER["account.js"]}` })));   // sahifa JavaScript’siz: navbar menyulari <details> bilan ishlaydi
}));
// ---------- Biznes: tariflar, yuristlar katalogi, Yurist Pro kabineti ----------
const REDIRECTED = Symbol("redirected");
function bizPage(render){
  return (req, res, next) => wrap(async () => {
    const forced = parseLang(req.query.lang);
    if (forced) res.cookie(LANG_COOKIE, forced, { maxAge: 365 * 864e5, sameSite:"lax", path:"/" });
    const fs = /(?:^|;\s*)hy_fs=([1-3])(?:;|$)/.exec(req.headers.cookie || "")?.[1];
    const query = Object.fromEntries(Object.entries(req.query).filter(([k, v]) => k !== "lang" && typeof v === "string" && v.length < 100));
    const extra = req.path.startsWith("/yuristlar") ? await approvedLawyers() : [];
    const html = await render({ lang: forced || req.lang, cssHref: `/app.css?v=${VER["app.css"]}`, jsHref: `/kabinet.js?v=${VER["kabinet.js"]}`,
      accHref: `/account.js?v=${VER["account.js"]}`, fs, query, id: req.params.id, user: req.user, extra, db: dbEnabled(), res, req });
    if (!html) return next();
    if (html === REDIRECTED) return;
    res.set({ "Cache-Control": req.user ? "private, no-store" : "no-cache", "Vary":"Cookie, Accept-Language", "Content-Language": HTML_LANG[forced || req.lang] }).type("html").send(withTheme(req, html));
  })(req, res, next);
}
app.get("/tariflar", bizPage(async a => plansPage({ ...a, subs: a.user ? await mySubscriptions(a.user.id) : [] })));
app.get("/maxfiylik", bizPage(a => privacyPage({ ...a, ai: aiEnabled(), provider: aiProvider(), botUrl: process.env.TELEGRAM_BOT_URL })));
app.get("/yuristlar", bizPage(lawyersPage));
app.get("/yuristlar/rasm/:id", (req, res, next) => dbEnabled() ? wrap(sendPhoto)(req, res, next) : next());
// Ish (fuqaro yuristga yuborgan reja va ariza): faqat ikki ishtirokchi; begona kishi uchun 404 (mavjudligi ham bilinmaydi)
app.get("/hisob/ish/:id", (req, res, next) => dbEnabled() ? next() : res.status(503).type("text").send("DB"), bizPage(async a => {
  const c = await caseFor(a.user, a.id);
  if (!c) return null;
  if (c.side === "lawyer" && c.case_data) await audit(q, { userId: a.user.id, action: "case.view", target: `consultation:${c.id}`, ip: a.req.ip });
  return casePage({ ...a, c });
}));
app.get("/hisob/ish/:id/:fmt", (req, res, next) => (async () => {
  const fmt = req.params.fmt;
  if (!dbEnabled() || (fmt !== "docx" && fmt !== "pdf")) return next();
  const c = await caseFor(req.user, req.params.id);
  if (!c?.case_data) return next();
  const d = c.case_data, m = documentModel({ ...d, lang: base(d.lang) }), model = d.lang === "cyr" ? cyrillicModel(m) : m;
  const buf = fmt === "docx" ? await toDocx(model) : await toPdf(model);
  if (c.side === "lawyer") await audit(q, { userId: req.user.id, action: "case.download", target: `consultation:${c.id}`, data: { fmt }, ip: req.ip });
  res.set({
    "Content-Type": fmt === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf",
    "Content-Disposition": `attachment; filename="${safeName(`HuquqYol-ish-${c.id}-${model.scenario}.${fmt}`)}"`, "Cache-Control": "private, no-store"
  }).send(buf);
})().catch(next));
app.get("/yuristlar/:id", bizPage(args => { const h = lawyerPage(args); if (h) recordView(args.id, args.query.soha); return h; }));
app.get("/kabinet", bizPage(async a => cabinetPage({ ...a, pro: a.req.pro || await proStatus(a.user.id) })));
// Mavzu (yorug‘ / qorong‘i): JavaScript’siz ham ishlaydi — cookie qo‘yib, sahifaga qaytaradi (to=toggle — almashtirish)
app.get("/mavzu", (req, res) => {
  const cur = themeOf(req);
  const to = req.query.to === "toggle" ? (cur === "dark" ? "light" : "dark") : ["light", "dark"].includes(req.query.to) ? req.query.to : null;
  if (to) res.cookie("hy_theme", to, { maxAge: 365 * 864e5, sameSite:"lax", path:"/" }); else res.clearCookie("hy_theme", { path:"/" });
  const back = typeof req.query.back === "string" && /^\/[a-z0-9/_?=&%.-]*$/i.test(req.query.back) && !req.query.back.startsWith("//") ? req.query.back : "/";
  res.redirect(303, back);
});
app.get("/kirish", bizPage(a => a.user ? (a.res.redirect(303, HOME[roleOf(a.user)]), REDIRECTED) : loginPage(a)));
app.get("/royxat", bizPage(a => a.user ? (a.res.redirect(303, HOME[roleOf(a.user)]), REDIRECTED) : registerPage(a)));
// Quyidagi sahifalarga kim kira olishini guard (server/access.js) hal qiladi — bu yerda faqat chizish
app.get("/hisob", bizPage(async a => {
  const subs = await mySubscriptions(a.user.id);
  let panel = "";
  if (a.user.role === "lawyer"){
    const [profile, pro] = await Promise.all([myProfile(a.user.id), proStatus(a.user.id)]);
    panel = lawyerPanel({ ...a, profile, pro, counts: practiceCounts(a.lang, await customActs()), stats: profile ? await lawyerStats(profile.id) : null,
      pendingSub: subs.some(s => s.status === "pending" && s.plan === "pro") });
  }
  const application = a.user.role === "citizen" ? await myProfile(a.user.id) : null;      // «Yurist bo‘lish» arizasi holati
  return accountPage({ ...a, subs, cons: await consultationsFor(a.user), panel, application });
}));
app.get("/yurist-bolish", bizPage(async a => applyPage({ ...a, application: await myProfile(a.user.id) })));
// ---------- To‘lov, xavfsizlik, jamoa ----------
app.get("/oferta", bizPage(offerPage));
app.get("/parol-unutdim", bizPage(forgotPage));
const tokenPage = (kind, render) => bizPage(async a => { a.res.set("Referrer-Policy", "no-referrer"); return render({ ...a, token: String(a.query.t || ""), valid: dbEnabled() && !!await peekToken(kind, a.query.t) }); });
app.get("/parol-tiklash", tokenPage("reset", resetPage));
app.get("/tasdiqlash", tokenPage("verify", confirmPage));
app.get("/xavfsizlik", bizPage(async a => securityPage({ ...a, sessions: await sessionsOf(a.req) })));
app.get("/malumotlarim", rateLimit({ max: 5, name:"export" }), wrap(exportData));
app.get("/hisob/tolovlar", bizPage(async a => paymentsPage({ ...a, list: await myPayments(a.user.id) })));
app.get("/tolov/:id", bizPage(async a => {
  const p = await getPayment(a.id, a.user.id);
  if (!p) return null;
  const t = await one("select state, fiscal from pay_tx where payment_id = $1 order by id desc limit 1", [p.id]);
  return checkoutPage({ ...a, p, tx: t, fiscal: t?.fiscal?.perform?.url || "" });
}));
app.get("/tolov/:id/hisob-faktura", rateLimit({ max: 20, name:"invoice" }), (req, res, next) => wrap(async () => {
  const p = await getPayment(req.params.id, req.user.id);
  if (!p || !bankTransfer() || !(Number(p.amount) > 0)) return next();
  const org = req.user.org_id ? await one("select name, inn from organizations where id = $1", [req.user.org_id]) : null;
  const pdf = await invoicePdf({ lang: req.lang, p, user: req.user, org });
  res.set({ "Content-Type": "application/pdf", "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="HuquqYol-hisob-faktura-${p.id}.pdf"` }).send(pdf);
})(req, res, next));
app.get("/jamoa", bizPage(async a => teamPage({ ...a, team: await teamInfo(a.user) })));
app.get("/jamoa/taklif", bizPage(async a => invitePage({ ...a, token: String(a.query.t || ""), inv: await inviteView(a.query.t) })));
app.get("/sitemap.xml", (req, res) => {
  if (!OG_BASE) return res.status(404).type("text").send("");
  const urls = ["/", "/yuristlar", "/tariflar", "/statistika", "/maxfiylik", "/oferta"];
  res.set("Cache-Control", "public, max-age=3600").type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${OG_BASE}${u}</loc></url>`).join("")}</urlset>`);
});
app.get("/robots.txt", (req, res) => res.set("Cache-Control", "public, max-age=3600").type("text/plain").send(
  `User-agent: *\nAllow: /\n${["/api/", "/hisob", "/admin", "/kabinet", "/tolov", "/jamoa", "/xavfsizlik", "/parol-", "/tasdiqlash"].map(p => `Disallow: ${p}`).join("\n")}\n${OG_BASE ? `Sitemap: ${OG_BASE}/sitemap.xml\n` : ""}`));
app.get("/hisob/profil", bizPage(async a => profileEditPage({ ...a, profile: await myProfile(a.user.id), counts: practiceCounts(a.lang, await customActs()) })));
app.get("/hisob/statistika", bizPage(async a => {
  const profile = await myProfile(a.user.id);
  return lawyerStatsPage({ ...a, profile, stats: profile ? await lawyerStats(profile.id) : null });
}));
app.get("/admin", bizPage(async a => adminPage({ ...a, a: await adminStats(), s: stats.summary({ scenarioDomain: SCEN_DOMAIN }), photos: await photoQueue(), acts: await customActs() })));

// JS modullari ichidagi importlar ham versiyalanadi
const rewriteImports = src => MODULES.reduce((h, f) => h.replaceAll(`"/${f}"`, `"/${f}?v=${VER[f]}"`).replaceAll(`"./${f}"`, `"/${f}?v=${VER[f]}"`), src);
for (const f of MODULES){
  const code = rewriteImports(readFileSync(join(PUBLIC, f), "utf8"));
  app.get("/" + f, (req, res) => res.set("Cache-Control", req.query.v ? "public, max-age=31536000, immutable" : "no-cache").type("js").send(code));
}

// Shriftlar o‘zimizda (tashqi CDN yo‘q — maxfiylik va CSP uchun)
const fontOpts = { maxAge:"365d", immutable:true };
// PDF o‘qish (pdf.js) — faqat brauzerda, PDF tanlanganda yuklanadi. Versiya URL’da: bir yil keshlanadi.
for (const f of ["pdf.min.mjs", "pdf.worker.min.mjs"])
  app.get(`${PDFJS_BASE}/${f}`, (req, res) => res.set("Cache-Control", "public, max-age=31536000, immutable").type("js").sendFile(join(PDFJS_DIR, "build", f)));
app.use(`${PDFJS_BASE}/cmaps`, express.static(join(PDFJS_DIR, "cmaps"), fontOpts));
app.use(`${PDFJS_BASE}/standard_fonts`, express.static(join(PDFJS_DIR, "standard_fonts"), fontOpts));
app.use("/fonts/onest", express.static(fontDir("@fontsource/onest"), fontOpts));
app.use("/fonts/spectral", express.static(fontDir("@fontsource/spectral"), fontOpts));
app.use("/fonts/caveat", express.static(fontDir("@fontsource/caveat"), fontOpts));
app.use("/fonts/jetbrains-mono", express.static(fontDir("@fontsource/jetbrains-mono"), fontOpts));
app.use(express.static(PUBLIC, {
  extensions:["html"], index:false,
  setHeaders(res, path){
    const url = res.req.originalUrl;
    if (path.endsWith("sw.js")) res.set({ "Cache-Control":"no-cache", "Service-Worker-Allowed":"/" });
    else if (/[?&]v=/.test(url)) res.set("Cache-Control", "public, max-age=31536000, immutable");
    else res.set("Cache-Control", process.env.NODE_ENV === "production" ? "public, max-age=3600" : "no-cache");
    if (path.endsWith(".webmanifest")) res.type("application/manifest+json");
  }
}));

// Noma’lum sahifa: til bo‘yicha qisqa 404 sahifasi
const NOT_FOUND = Object.fromEntries(LANGS.map(l => { const t = makeT(l);
  return [l, `<!doctype html><html lang="${HTML_LANG[l]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${t("notFoundPage")} — HuquqYo‘l</title><link rel="icon" href="/icons/icon.svg" type="image/svg+xml"><link rel="stylesheet" href="/app.css?v=${VER["app.css"]}"></head><body><main class="wrap nf"><h1>404</h1><p>${t("notFoundPage")}</p><a class="btn primary" href="/">${t("toHome")}</a></main></body></html>`]; }));
app.use((req, res, next) => req.method === "GET" || req.method === "HEAD" ? res.status(404).type("html").send(NOT_FOUND[req.lang]) : next());

app.use((err, req, res, next) => {
  const lang = req.lang || resolveLang(req);
  if (err.type === "entity.too.large") return res.status(413).json({ error: msg(lang, "tooLarge") });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: msg(lang, "badJson") });
  const status = err.status && (err.status < 500 || err.key) ? err.status : 500;   // kalitli xatolar (masalan, AI yo‘q — 503) o‘z holatini saqlaydi
  if (status === 500) console.error("[server]", err.message);
  res.status(status).json({ error: status === 500 ? msg(lang, "server") : err.key ? msg(lang, err.key, err.vars) : err.message });
});

// Serverni ishga tushirish. Hosting (Passenger/cPanel) PORT ni o‘zi beradi; VPS’da HOST=127.0.0.1 bilan
// faqat Nginx orqali ochiladi. Passenger’da port raqam emas, soket yo‘li bo‘lishi mumkin.
export function start({ port = process.env.PORT || 3000, host = process.env.HOST } = {}){
  stats.attachFile(STATS_FILE);                                   // anonim statistika faqat haqiqiy ishga tushirishda diskka yoziladi
  if (dbEnabled()) migrate().then(n => { if (n) console.log(`[db] ${n} ta migratsiya qo‘llandi`); startJobs(); }).catch(e => console.error("[db] migratsiya:", e.message));
  ocrWarmUp();                                                    // OCR til fayllari oldindan yuklanadi (birinchi rasm tezroq o‘qiladi)
  const p = /^\d+$/.test(String(port)) ? Number(port) : port;
  const onListen = () => console.log(`HuquqYo‘l ishga tushdi: ${typeof p === "number" ? `http://${host || "localhost"}:${p}` : p}  (AI: ${aiEnabled() ? aiProvider() : "o‘chiq — qidiruv rejimi"})`);
  const server = host && typeof p === "number" ? app.listen(p, host, onListen) : app.listen(p, onListen);
  server.requestTimeout = 30_000; server.headersTimeout = 15_000; server.keepAliveTimeout = 65_000;
  const stop = () => { stopJobs(); stats.close(); ocrShutdown(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 8000).unref(); };   // statistika diskka yoziladi
  process.once("SIGTERM", stop); process.once("SIGINT", stop);
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) start();
