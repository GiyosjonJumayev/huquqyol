// Sinov uchun PDF namunalari (soxta ma’lumotlar): node test/fixtures/make-pdf-fixtures.mjs
//  - buyruq-matnli.pdf: matnli PDF (Word’dan saqlangandek) — ishdan bo‘shatish buyrug‘i, 2 sahifa
//  - qaror-skan.pdf: skanerlangan PDF — ichida faqat rasm (yhxx-qaror-foto.jpg), matn yo‘q
import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const FONT = join(dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf", "DejaVuSerif.ttf");
const FONTB = join(dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf", "DejaVuSerif-Bold.ttf");
const save = (doc, name) => new Promise(r => { const s = createWriteStream(join(here, name)); doc.pipe(s); doc.end(); s.on("finish", r); });

{
  const d = new PDFDocument({ size: "A4", margin: 60, info: { Title: "Buyruq" } });
  d.font(FONTB).fontSize(14).text("«Bog‘bon Agro» MChJ", { align: "center" });
  d.font(FONT).fontSize(11).text("Toshkent sh., Yashnobod tumani, Mehnat ko‘chasi 12", { align: "center" }).moveDown(1.5);
  d.font(FONTB).fontSize(14).text("BUYRUQ № 112-k", { align: "center" }).moveDown(0.5);
  d.font(FONT).fontSize(12).text("Sana: 02.11.2026                                                     Toshkent shahri").moveDown();
  d.text("Xodimni ishdan bo‘shatish to‘g‘risida", { align: "center" }).moveDown();
  d.text("O‘zbekiston Respublikasi Mehnat kodeksining 161-moddasi asosida BUYURAMAN:").moveDown(0.5);
  d.text("1. Omborchi Karimov Aziz Botirovich 2026-yil 2-noyabrdan ishdan bo‘shatilsin.");
  d.text("2. Buxgalteriyaga hisob-kitobni amalga oshirish topshirilsin.").moveDown(2);
  d.text("Direktor:  B. Rahimov            ____________");
  d.addPage().font(FONT).fontSize(12).text("Buyruq bilan tanishdim: ____________   Sana: ________");
  await save(d, "buyruq-matnli.pdf");
}
{
  const d = new PDFDocument({ size: "A4", margin: 0, info: { Title: "Skan" } });
  d.image(join(here, "yhxx-qaror-foto.jpg"), 0, 0, { fit: [595, 842], align: "center", valign: "center" });
  await save(d, "qaror-skan.pdf");
}
console.log("tayyor");
