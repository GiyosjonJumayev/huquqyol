import express from "express";
import compression from "compression";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { SCENARIOS, NORMS, DOMAINS, LAWS, APPLICANT_FIELDS, LEX_URL } from "./kb.js";
import { analyze, aiEnabled } from "./analyze.js";
import { buildPlan, CB_RATE } from "./plan.js";
import { documentModel, toDocx, toPdf } from "./documents.js";
import { securityHeaders, requireJson, rateLimit } from "./security.js";
import { vAnalyze, vPlan, vDocument } from "./validate.js";
import { cyrillicModel } from "../public/translit.js";
import { domainCardsHTML, examplesHTML } from "../public/shared.js";

const buildModel = req => { const v = vDocument(req.body); const m = documentModel(v); return v.lang === "cyr" ? cyrillicModel(m) : m; };

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const fontDir = pkg => join(dirname(require.resolve(`${pkg}/package.json`)), "files");

export const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : process.env.TRUST_PROXY);
app.use(compression());
app.use(securityHeaders);
app.use("/api", requireJson, express.json({ limit: "32kb", strict: true }));

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

app.get("/api/health", (req, res) => res.json({ ok:true, ai: aiEnabled(), norms: NORMS.length, scenarios: SCENARIOS.length }));

// Ommaviy spetsifikatsiya: shablon matnlari va kalit so‘zlar yuborilmaydi
const META = {
  cbRate: CB_RATE, lex: LEX_URL, domains: DOMAINS, applicant: APPLICANT_FIELDS,
  laws: Object.fromEntries(Object.entries(LAWS).map(([k, l]) => [k, { name:l.name, url:l.url }])),
  scenarios: SCENARIOS.map(s => ({
    id:s.id, domain:s.domain, title:s.title, card:s.card, short:s.short, trigger:s.trigger,
    docs: s.docs.map(d => ({ id:d.id, label:d.label, howto:d.howto })), fields: s.fields, calc: s.calc?.type || null, deadline: s.deadline
  }))
};
app.get("/api/meta", (req, res) => res.json({ ai: aiEnabled(), ...META }));

app.post("/api/analyze", rateLimit({ max: 15, name:"analyze" }), wrap(async (req, res) => {
  res.json(await analyze(vAnalyze(req.body).text));
}));

app.post("/api/plan", rateLimit({ max: 120, name:"plan" }), (req, res) => res.json(buildPlan(vPlan(req.body))));

app.post("/api/document/preview", rateLimit({ max: 240, name:"preview" }), (req, res) => res.json(buildModel(req)));

app.post("/api/document/:format", rateLimit({ max: 30, name:"file" }), wrap(async (req, res) => {
  const fmt = req.params.format;
  if (fmt !== "docx" && fmt !== "pdf") return res.status(404).json({ error:"Format: docx yoki pdf." });
  const model = buildModel(req);
  const buf = fmt === "docx" ? await toDocx(model) : await toPdf(model);
  res.set({
    "Content-Type": fmt === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf",
    "Content-Disposition": `attachment; filename="HuquqYol-${model.scenario}-${model.recipient}.${fmt}"`
  }).send(buf);
}));

app.use("/api", (req, res) => res.status(404).json({ error:"Topilmadi." }));

// ---------- Statik fayllar ----------
// Fayl nomiga kontent xeshi (?v=...) qo‘shiladi: brauzer faylni bir yil keshlaydi, yangi versiyada URL o‘zgaradi.
const PUBLIC = join(here, "..", "public");
const hashOf = f => createHash("sha256").update(readFileSync(join(PUBLIC, f))).digest("hex").slice(0, 10);
const ASSETS = ["app.css", "app.js", "shared.js", "translit.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png"];
const VER = Object.fromEntries(ASSETS.map(f => [f, hashOf(f)]));
const versioned = (html, list) => list.reduce((h, f) => h.replaceAll(`"/${f}"`, `"/${f}?v=${VER[f]}"`), html);

// Bosh sahifa serverda oldindan chiziladi: soha kartalari, namunalar va meta-ma’lumot HTML ichida keladi
const jsonForHtml = o => JSON.stringify(o).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, "");
function renderIndex(){
  const meta = { ai: aiEnabled(), ...META };
  return versioned(readFileSync(join(PUBLIC, "index.html"), "utf8"), ASSETS)
    .replace("<!--DOMAINS-->", domainCardsHTML(meta))
    .replace("<!--EXAMPLES-->", examplesHTML())
    .replace("<!--AITEXT-->", meta.ai ? "AI tahlil: Claude" : "Qidiruv tahlili")
    .replace("<!--META-->", `<script type="application/json" id="meta-data">${jsonForHtml(meta)}</script>`);
}
const INDEX = renderIndex();
app.get(["/", "/index.html"], (req, res) => res.set("Cache-Control", "no-cache").type("html").send(INDEX));
// app.js ichidagi importlar ham versiyalanadi
const APP_JS = versioned(readFileSync(join(PUBLIC, "app.js"), "utf8"), ["translit.js", "shared.js"]);
app.get("/app.js", (req, res) => res.set("Cache-Control", req.query.v ? "public, max-age=31536000, immutable" : "no-cache").type("js").send(APP_JS));

// Shriftlar o‘zimizda (tashqi CDN yo‘q — maxfiylik va CSP uchun)
const fontOpts = { maxAge:"365d", immutable:true };
app.use("/fonts/onest", express.static(fontDir("@fontsource/onest"), fontOpts));
app.use("/fonts/spectral", express.static(fontDir("@fontsource/spectral"), fontOpts));
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

app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ error:"So‘rov juda katta." });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error:"JSON noto‘g‘ri." });
  const status = err.status && err.status < 500 ? err.status : 500;
  if (status === 500) console.error("[server]", err.message);
  res.status(status).json({ error: status === 500 ? "Serverda xatolik yuz berdi." : err.message });
});

if (process.argv[1] === fileURLToPath(import.meta.url)){
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => console.log(`HuquqYo‘l: http://localhost:${port}  (AI: ${aiEnabled() ? "Claude" : "o‘chiq — qidiruv rejimi"})`));
  server.requestTimeout = 30_000; server.headersTimeout = 15_000;
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGTERM", stop); process.on("SIGINT", stop);
}
