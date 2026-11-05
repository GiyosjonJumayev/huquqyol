import { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, PageNumber } from "docx";
import PDFDocument from "pdfkit";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { kbFor } from "./kb.js";
import { deadlineFrom, parseISO, startOfDay, addMonths } from "./dates.js";
import { alimonyShare } from "./plan.js";
import { fmtDate, fmtMoney, termText } from "../public/i18n.js";

// Hujjatdagi doimiy so‘zlar
const DOC = {
  uz:{ addr:", yashash manzili: ", tel:", tel.: ", attach:"Ilovalar:", sign:"Imzo: ____________  ", copy:" (nusxa).", isCopy:/nusxa|guvoh|kvitansiya/i, key: x => x.toLowerCase().slice(0, 18) },
  ru:{ addr:", адрес проживания: ", tel:", тел.: ", attach:"Приложения:", sign:"Подпись: ____________  ", copy:" (копия).", isCopy:/копи|свидетельств|квитанц|выписк/i, key: x => x.toLowerCase().replace(/^копи[яи]\s+/, "").split(/\s+/).slice(0, 3).map(w => w.slice(0, 5)).join(" ") }
};

const require = createRequire(import.meta.url);
const FONT_DIR = join(dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf");

// ---------- Shablon dvigateli ----------
// {{kalit}} — maydon yoki hisoblangan qiymat; [?kalit]...[/] — qiymat bo‘lsa; [!kalit]...[/] — bo‘lmasa.
// Natija: qismlar ro‘yxati — {v:"matn"} yoki to‘ldirilmagan joy {ph:"yorliq", k:"maydon"}.
const COND = /\[([?!])(\w+)\]([\s\S]*?)\[\/\]/g;
const TOKEN = /\{\{(\w+)\}\}/g;

function makeContext(s, form, trigger, deadline, now, kb){
  const lang = kb.lang, fm = kb.fieldMap(s), vals = Object.create(null);
  for (const [k, f] of Object.entries(fm)){
    const raw = String(form[k] ?? "").trim();
    if (!raw) continue;
    if (f.type === "money"){ if (Number(raw) > 0) vals[k] = fmtMoney(Number(raw), lang); }
    else if (f.type === "date"){ const d = parseISO(raw); if (d) vals[k] = fmtDate(d, lang); }
    else if (f.type === "select"){ const o = f.options.find(o => o.v === raw); if (o){ vals[k] = o.doc; if (o.court) vals[k + "Court"] = o.court; } }
    else vals[k] = raw;
  }
  vals.trigger = fmtDate(trigger, lang);
  if (deadline) vals.deadline = fmtDate(deadline, lang);
  vals.deadlineTerm = termText(s.deadline, lang);
  vals.today = fmtDate(now, lang);
  const sh = alimonyShare(Math.round(Number(form.children) || 0));
  if (sh) vals.share = lang === "ru" ? sh.ru : sh.text;
  return { vals, fm, W: DOC[lang] };
}

function render(tpl, ctx){
  const str = tpl.replace(COND, (_, sign, key, inner) => ((key in ctx.vals) === (sign === "?")) ? inner : "");
  const parts = [];
  const push = p => { const last = parts[parts.length - 1]; if (p.v != null && last?.v != null) last.v += p.v; else if (p.v !== "") parts.push(p); };
  let i = 0;
  for (const m of str.matchAll(TOKEN)){
    if (m.index > i) push({ v: str.slice(i, m.index) });
    const key = m[1];
    if (key === "applicant") ["fio", ctx.W.addr, "address", ctx.W.tel, "phone"].forEach((x, j) => push(j % 2 ? { v:x } : field(x, ctx)));
    else push(field(key, ctx));
    i = m.index + m[0].length;
  }
  if (i < str.length) push({ v: str.slice(i) });
  for (const p of parts) if (p.v != null) p.v = p.v.replace(/(г|yil)\.\./g, "$1.");   // «2027 г.» + «.»
  const meaningful = parts.some(p => p.ph || /[\p{L}\p{N}]/u.test(p.v));
  return meaningful ? parts : null;
}
// {{demandCourt}} kabi hosila kalitlar asosiy maydon (demand) bilan bog‘lanadi
const field = (k, ctx) => {
  if (k in ctx.vals) return { v: ctx.vals[k] };
  const base = ctx.fm[k] ? k : k.replace(/Court$/, "");
  return { ph: ctx.fm[base]?.ph || k, k: base };
};

const P = (v, ph, k) => (v ? { v: String(v) } : { ph, k });

// Hujjat modeli: bloklar ro‘yxati. Ko‘rinish (JSON), DOCX va PDF shu modeldan yasaladi.
export function documentModel({ scenario, recipient, form = {}, evidence = [], triggerDate, today = new Date(), lang = "uz" }){
  const kb = kbFor(lang === "ru" ? "ru" : "uz");
  const s = kb.SCENARIO_BY_ID[scenario];
  if (!s) throw Object.assign(new Error("Noma’lum holat."), { status: 400 });
  const tpl = s.docs.find(d => d.id === recipient) || s.docs[0];
  const now = startOfDay(today);
  const trigger = parseISO(triggerDate) || addMonths(now, -1);
  const deadline = deadlineFrom(trigger, s.deadline);
  const ctx = makeContext(s, form, trigger, deadline, now, kb), W = ctx.W;
  const R = t => render(t, ctx);
  const B = [];

  const lines = tpl.to.map(R).filter(Boolean);
  B.push({ t:"addr", lines });
  B.push({ t:"title", text: tpl.title });
  if (tpl.sub) B.push({ t:"sub", text: tpl.sub });
  for (const p of tpl.body.map(R).filter(Boolean)) B.push({ t:"p", parts: p });
  if (ctx.vals.extra) B.push({ t:"p", parts:[{ v: ctx.vals.extra }] });
  B.push({ t:"lbl", text: tpl.askLabel });
  B.push({ t:"list", items: tpl.asks.map(R).filter(Boolean) });
  const closing = tpl.closing && R(tpl.closing);
  if (closing) B.push({ t:"p", parts: closing });

  // Ilovalar: shablondagi hujjatlar + foydalanuvchi belgilagan dalillar (takrorlarsiz)
  const picked = evidence.map(i => s.evidence[i]).filter(Boolean).map(e => e.replace(/\s*\(.*\)$/, ""));
  const seen = new Set();
  const att = [...tpl.attach, ...picked]
    .filter(x => { const key = W.key(x); return !seen.has(key) && seen.add(key); })
    .map(x => W.isCopy.test(x) ? x.replace(/\.?$/, ".") : x + W.copy);
  B.push({ t:"lbl", text: W.attach });
  B.push({ t:"list", items: att.map(x => [{ v:x }]) });
  B.push({ t:"sign", left: fmtDate(now, kb.lang), right:[{ v: W.sign }, P(ctx.vals.fio, ctx.fm.fio.ph, "fio")] });

  const missing = [], seenK = new Set();
  for (const b of B) for (const p of [...(b.parts || []), ...(b.lines || []).flat(), ...(b.items || []).flat(), ...(b.right || [])])
    if (p.ph && !seenK.has(p.k)){ seenK.add(p.k); missing.push({ k:p.k, label:p.ph }); }
  return { scenario, recipient: tpl.id, lang: kb.lang, blocks: B, missing };
}

const partText = ps => ps.map(p => p.v ?? `[${p.ph}]`).join("");

// ---------- DOCX ----------
export async function toDocx(model){
  const font = "Times New Roman", size = 28;
  const run = (text, o = {}) => new TextRun({ text, font, size, bold: o.b, italics: o.i });
  const runs = ps => ps.map(p => run(p.v ?? `[${p.ph}]`));
  const children = [];
  for (const b of model.blocks){
    if (b.t === "addr") b.lines.forEach((l, i) => children.push(new Paragraph({ children: runs(l), indent:{ left: 4820 }, spacing:{ after: i === b.lines.length - 1 ? 240 : 40 } })));
    else if (b.t === "title") children.push(new Paragraph({ children:[run(b.text, { b:true })], alignment: AlignmentType.CENTER, spacing:{ before:120, after:40 } }));
    else if (b.t === "sub") children.push(new Paragraph({ children:[run(b.text, { i:true })], alignment: AlignmentType.CENTER, spacing:{ after:240 } }));
    else if (b.t === "p") children.push(new Paragraph({ children: runs(b.parts), alignment: AlignmentType.JUSTIFIED, indent:{ firstLine: 709 }, spacing:{ after:80, line:300 } }));
    else if (b.t === "lbl") children.push(new Paragraph({ children:[run(b.text, { b:true })], spacing:{ before:120, after:60 } }));
    else if (b.t === "list") b.items.forEach((it, n) => children.push(new Paragraph({ children:[run(`${n + 1}. `), ...runs(it)], indent:{ left:709, hanging:360 }, alignment: AlignmentType.JUSTIFIED, spacing:{ after:40 } })));
    else if (b.t === "sign"){
      children.push(new Paragraph({ children:[run(b.left)], spacing:{ before:480, after:40 } }));
      children.push(new Paragraph({ children: runs(b.right), alignment: AlignmentType.RIGHT }));
    }
  }
  const doc = new Document({
    creator:"HuquqYo‘l", title: model.blocks.find(b => b.t === "title")?.text || "Ariza",
    sections:[{ properties:{ page:{ margin:{ top:1134, right:850, bottom:1134, left:1701 } } }, children,
      footers:{ default: new Footer({ children:[new Paragraph({ alignment: AlignmentType.CENTER, children:[new TextRun({ children:[PageNumber.CURRENT], font, size: 20 })] })] }) } }]
  });
  return Packer.toBuffer(doc);
}

// ---------- PDF (DejaVu — o‘zbek harflari to‘liq) ----------
export function toPdf(model){
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size:"A4", bufferPages:true, margins:{ top:56, bottom:56, left:85, right:42 }, info:{ Title: model.blocks.find(b => b.t === "title")?.text || "Ariza", Creator:"HuquqYo‘l" } });
    const chunks = []; doc.on("data", c => chunks.push(c)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    doc.registerFont("R", join(FONT_DIR, "DejaVuSerif.ttf"));
    doc.registerFont("B", join(FONT_DIR, "DejaVuSerif-Bold.ttf"));
    doc.registerFont("I", join(FONT_DIR, "DejaVuSerif-Italic.ttf"));
    const W = doc.page.width - 85 - 42, size = 11.5;
    doc.fontSize(size);
    for (const b of model.blocks){
      if (b.t === "addr"){ b.lines.forEach(l => doc.font("R").text(partText(l), 85 + W * 0.48, undefined, { width: W * 0.52 })); doc.moveDown(1); }
      else if (b.t === "title") doc.font("B").text(b.text, 85, undefined, { width: W, align:"center", characterSpacing: 1 });
      else if (b.t === "sub"){ doc.font("I").text(b.text, 85, undefined, { width: W, align:"center" }); doc.moveDown(0.8); }
      else if (b.t === "p") doc.font("R").text(partText(b.parts), 85, undefined, { width: W, align:"justify", indent: 28, paragraphGap: 4, lineGap: 1.5 });
      else if (b.t === "lbl"){ doc.moveDown(0.3); doc.font("B").text(b.text, 85, undefined, { width: W }); }
      else if (b.t === "list") b.items.forEach((it, n) => doc.font("R").text(`${n + 1}. ${partText(it)}`, 85 + 20, undefined, { width: W - 20, align:"justify", paragraphGap: 2 }));
      else if (b.t === "sign"){
        doc.moveDown(2); const y = doc.y;
        doc.font("R").text(b.left, 85, y, { width: W / 2 });
        doc.text(partText(b.right), 85 + W / 2, y, { width: W / 2, align:"right" });
      }
    }
    // Bir sahifadan ko‘p bo‘lsa — pastda sahifa raqami
    const range = doc.bufferedPageRange();
    if (range.count > 1) for (let i = 0; i < range.count; i++){
      doc.switchToPage(range.start + i);
      const bottom = doc.page.margins.bottom; doc.page.margins.bottom = 0;
      doc.font("R").fontSize(9).text(String(i + 1), 85, doc.page.height - 34, { width: W, align:"center", lineBreak:false });
      doc.page.margins.bottom = bottom;
    }
    doc.end();
  });
}
