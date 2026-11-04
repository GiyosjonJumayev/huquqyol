// lex.uz'dan saqlangan Mehnat kodeksi sahifasini moddalarga bo‘lib, qidiruv bazasiga qo‘shadi.
// Foydalanish:
//   1) Brauzerda https://lex.uz/acts/-6257288 ni oching → "Sahifani saqlash" (HTML) → mehnat-kodeksi.html
//   2) npm run ingest -- mehnat-kodeksi.html
// Natija: server/kb/lex-articles.json (server qayta ishga tushganda RAG uni avtomatik ishlatadi)
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file){ console.error("Foydalanish: npm run ingest -- <saqlangan-lex-sahifa.html>"); process.exit(1); }

const html = readFileSync(file, "utf8");
const text = html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<br\s*\/?>|<\/(div|p|li|h\d)>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n");

// Modda sarlavhasi: "253-modda. Ish haqini to‘lash muddatlari"
const re = /^\s*(\d{1,3})-modda\.\s*(.+)$/gm;
const heads = [...text.matchAll(re)];
const articles = heads.map((m, i) => {
  const start = m.index + m[0].length, end = i + 1 < heads.length ? heads[i + 1].index : text.length;
  const body = text.slice(start, end)
    .split("\n").map(s => s.trim())
    .filter(s => s && !/^(OKOZ|TSZ|LexUZ sharhi|\[\*\*|Oldingi tahrirga)/.test(s) && !/^\d+\.\d{2}\.\d{2}\.\d{2}/.test(s))
    .join("\n").slice(0, 6000);
  return { id:`art${m[1]}`, number:Number(m[1]), article:`${m[1]}-modda`, title:m[2].trim(), text:body, source:`https://lex.uz/acts/-6257288` };
}).filter(a => a.text.length > 20);

// Bir xil raqamli takrorlarni (izohlar ichidagi havolalar) olib tashlash — birinchisi qoladi
const seen = new Set(), unique = articles.filter(a => !seen.has(a.number) && seen.add(a.number));
writeFileSync(new URL("../server/kb/lex-articles.json", import.meta.url), JSON.stringify(unique, null, 1));
console.log(`${unique.length} ta modda saqlandi → server/kb/lex-articles.json`);
