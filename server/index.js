import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SCENARIOS, NORMS, LEX_URL } from "./kb.js";
import { analyze, aiEnabled } from "./analyze.js";
import { buildPlan, CB_RATE } from "./plan.js";
import { documentModel, toDocx, toPdf, RECIPIENTS } from "./documents.js";

const here = dirname(fileURLToPath(import.meta.url));
export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use((req, res, next) => { res.set({ "X-Content-Type-Options":"nosniff", "Referrer-Policy":"same-origin" }); next(); });

// Oddiy rate limit (IP bo‘yicha, daqiqasiga) — AI xarajatini himoya qilish uchun
const hits = new Map();
function limit(max){
  return (req, res, next) => {
    const key = req.ip + req.path, now = Date.now();
    const h = (hits.get(key) || []).filter(t => now - t < 60_000);
    if (h.length >= max) return res.status(429).json({ error:"Juda ko‘p so‘rov. Bir daqiqadan keyin urinib ko‘ring." });
    h.push(now); hits.set(key, h); next();
  };
}

app.get("/api/health", (req, res) => res.json({ ok:true, ai: aiEnabled(), norms: NORMS.length, scenarios: SCENARIOS.length }));

app.get("/api/meta", (req, res) => res.json({
  ai: aiEnabled(), cbRate: CB_RATE, lex: LEX_URL, recipients: RECIPIENTS,
  scenarios: SCENARIOS.map(({ id, title, card, short, documents, compensation, trigger }) => ({ id, title, card, short, documents, compensation, trigger }))
}));

app.post("/api/analyze", limit(20), async (req, res, next) => {
  try {
    const text = String(req.body?.text ?? "").trim();
    if (text.length < 8) return res.status(400).json({ error:"Vaziyatni bir-ikki gap bilan yozing." });
    if (text.length > 4000) return res.status(400).json({ error:"Matn juda uzun (4000 belgigacha)." });
    res.json(await analyze(text));
  } catch (e) { next(e); }
});

app.post("/api/plan", (req, res, next) => {
  try { res.json(buildPlan(req.body || {})); } catch (e) { next(e); }
});

app.post("/api/document/preview", (req, res, next) => {
  try { res.json(documentModel(req.body || {})); } catch (e) { next(e); }
});

app.post("/api/document/:format", limit(30), async (req, res, next) => {
  try {
    const fmt = req.params.format;
    if (!["docx", "pdf"].includes(fmt)) return res.status(404).json({ error:"Format: docx yoki pdf" });
    const model = documentModel(req.body || {});
    const buf = fmt === "docx" ? await toDocx(model) : await toPdf(model);
    const kind = { employer:"talabnoma", inspection:"inspeksiyaga-ariza", court:"davo-arizasi" }[model.recipient];
    res.set({
      "Content-Type": fmt === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf",
      "Content-Disposition": `attachment; filename="HuquqYol-${kind}.${fmt}"`
    }).send(buf);
  } catch (e) { next(e); }
});

app.use(express.static(join(here, "..", "public"), { extensions:["html"] }));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "Serverda xatolik yuz berdi." : err.message });
});

if (process.argv[1] === fileURLToPath(import.meta.url)){
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`HuquqYo‘l: http://localhost:${port}  (AI: ${aiEnabled() ? "Claude" : "o‘chiq — qoidalar rejimi"})`));
}
