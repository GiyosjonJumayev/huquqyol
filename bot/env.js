// .env ni o‘qish (app.cjs dagi bilan bir xil qoida: tizim o‘zgaruvchilari ustun) va vaqt mintaqasi.
// Bu modul boshqa importlardan OLDIN yuklanishi kerak: server/analyze.js ANTHROPIC_API_KEY ni yuklanishda o‘qiydi.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export function loadEnv(file){
  let text;
  try { text = readFileSync(file, "utf8"); } catch { return; }
  for (const raw of text.split(/\r?\n/)){
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, "");
    if (process.env[m[1]] === undefined && v !== "") process.env[m[1]] = v;
  }
}
loadEnv(join(dirname(fileURLToPath(import.meta.url)), "..", ".env"));
if (!process.env.TZ) process.env.TZ = "Asia/Tashkent";
