import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { SCENARIOS, NORMS, LEX_URL } from "./kb.js";
import { analyze, aiEnabled } from "./analyze.js";
import { buildPlan, CB_RATE } from "./plan.js";
import { documentModel, toDocx, toPdf, RECIPIENTS } from "./documents.js";
import { securityHeaders, requireJson, rateLimit } from "./security.js";
import { vAnalyze, vPlan, vDocument } from "./validate.js";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const fontDir = pkg => join(dirname(require.resolve(`${pkg}/package.json`)), "files");

export const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : process.env.TRUST_PROXY);
app.use(securityHeaders);
app.use("/api", requireJson, express.json({ limit: "32kb", strict: true }));

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

app.get("/api/health", (req, res) => res.json({ ok:true, ai: aiEnabled(), norms: NORMS.length, scenarios: SCENARIOS.length }));

app.get("/api/meta", (req, res) => res.json({
  ai: aiEnabled(), cbRate: CB_RATE, lex: LEX_URL, recipients: RECIPIENTS,
  scenarios: SCENARIOS.map(({ id, title, card, short, documents, compensation, trigger }) => ({ id, title, card, short, documents, compensation, trigger }))
}));

app.post("/api/analyze", rateLimit({ max: 15, name:"analyze" }), wrap(async (req, res) => {
  res.json(await analyze(vAnalyze(req.body).text));
}));

app.post("/api/plan", rateLimit({ max: 120, name:"plan" }), (req, res) => res.json(buildPlan(vPlan(req.body))));

app.post("/api/document/preview", rateLimit({ max: 240, name:"preview" }), (req, res) => res.json(documentModel(vDocument(req.body))));

app.post("/api/document/:format", rateLimit({ max: 30, name:"file" }), wrap(async (req, res) => {
  const fmt = req.params.format;
  if (fmt !== "docx" && fmt !== "pdf") return res.status(404).json({ error:"Format: docx yoki pdf." });
  const model = documentModel(vDocument(req.body));
  const buf = fmt === "docx" ? await toDocx(model) : await toPdf(model);
  const kind = { employer:"talabnoma", inspection:"inspeksiyaga-ariza", court:"davo-arizasi" }[model.recipient];
  res.set({
    "Content-Type": fmt === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf",
    "Content-Disposition": `attachment; filename="HuquqYol-${kind}.${fmt}"`
  }).send(buf);
}));

app.use("/api", (req, res) => res.status(404).json({ error:"Topilmadi." }));

// Shriftlar o‘zimizda (tashqi CDN yo‘q — maxfiylik va CSP uchun)
const fontOpts = { maxAge:"30d", immutable:true };
app.use("/fonts/onest", express.static(fontDir("@fontsource/onest"), fontOpts));
app.use("/fonts/spectral", express.static(fontDir("@fontsource/spectral"), fontOpts));
app.use("/fonts/jetbrains-mono", express.static(fontDir("@fontsource/jetbrains-mono"), fontOpts));
app.use(express.static(join(here, "..", "public"), { extensions:["html"], maxAge: process.env.NODE_ENV === "production" ? "1h" : 0 }));

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
