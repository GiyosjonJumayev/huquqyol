// HuquqYo‘l — ishga tushirish fayli.
// cPanel «Setup Node.js App» (Phusion Passenger) va boshqa hostinglar uchun «Application startup file»: app.cjs
// CommonJS shaklida, chunki Passenger startup faylni require() bilan yuklaydi; ilovaning o‘zi ES modul.
"use strict";
const fs = require("node:fs");
const path = require("node:path");

// .env faylini o‘qish (agar bo‘lsa). Hosting panelida berilgan o‘zgaruvchilar ustun turadi.
function loadEnv(file){
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch { return; }
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
loadEnv(path.join(__dirname, ".env"));

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 18 || (major === 18 && minor < 18)){
  console.error(`HuquqYo‘l uchun Node.js 18.18 yoki yangiroq kerak (hozir ${process.version}). Hosting panelida Node.js 20 yoki 22 ni tanlang.`);
  process.exit(1);
}

import("./server/index.js")
  .then(m => m.start())
  .catch(err => { console.error("HuquqYo‘l ishga tushmadi:", err); process.exit(1); });
