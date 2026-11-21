// Dizayn v3: shriftlar faqat o‘z serverimizdan (Lighthouse uslubidagi tekshiruv), Caveat cheklangan,
// bosh sahifa tuzilmasi (docs/design/home-v3-reference.html) va hamma sahifada bir xil footer.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { app } = await import("../server/index.js");
let server, base;
before(() => new Promise(r => { server = app.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => server?.close());
const css = readFileSync(new URL("../public/app.css", import.meta.url), "utf8");

test("Shriftlar mahalliy: har bir @font-face /fonts/ dan, fayllar 200 va woff2; tashqi CDN yo‘q; CSP font-src 'self'", async () => {
  const faces = css.match(/@font-face\{[^}]+\}/g) || [];
  assert.ok(faces.length >= 30, String(faces.length));
  const urls = [...new Set(faces.map(f => /src:url\(([^)]+)\)/.exec(f)[1]))];
  assert.ok(urls.every(u => u.startsWith("/fonts/")), urls.filter(u => !u.startsWith("/fonts/")).join(" "));
  for (const fam of ["Onest", "Spectral", "Caveat"]) assert.ok(faces.some(f => f.includes(`font-family:"${fam}"`)), fam);
  assert.ok(faces.some(f => /font-family:"Spectral";font-style:italic/.test(f)), "Spectral kursiv (sarlavha urg‘usi)");
  for (const u of urls){
    const r = await fetch(base + u);
    assert.equal(r.status, 200, u);
    assert.match(r.headers.get("content-type") || "", /woff2|font/, u);
  }
  for (const p of ["/", "/tariflar", "/yuristlar", "/statistika", "/maxfiylik", "/kirish"]){
    const r = await fetch(base + p), html = await r.text();
    assert.ok(!/fonts\.(googleapis|gstatic)\.com|<link[^>]+https?:\/\/[^>]+stylesheet/i.test(html), p);
    assert.match(r.headers.get("content-security-policy") || "", /font-src 'self'/, p);
  }
  assert.ok(!/googleapis|gstatic|@import/.test(css));
});

test("Bosh sahifa v3: salom, sarlavha, xat-qog‘oz kiritish, 4 misol vaziyat, yo‘l, yordam, FAQ; Caveat ≤ 3 marta", async () => {
  for (const [lang, hi, h1] of [["uz", "Assalomu alaykum!", "Qanday muammo bo‘ldi?"], ["cyr", "Ассалому алайкум!", "Қандай муаммо бўлди?"], ["ru", "Здравствуйте!", "Что случилось?"]]){
    const html = await (await fetch(base + "/", { headers: { cookie: `hy_lang=${lang}` } })).text();
    assert.ok(html.includes(hi) && html.includes(h1), lang);
    assert.equal((html.match(/class="[^"]*\bhand\b/g) || []).length, 3, `${lang}: Caveat (qo‘lyozma) 3 marta — salom, rasm izohi, footer shiori`);
    assert.match(html, /<div class="ask letter">\s*<span class="ikat" aria-hidden="true"><\/span>/);
    assert.match(html, /<label for="problem" class="asklabel">/);                              // ko‘rinadigan yorliq
    assert.match(html, /<svg viewBox="0 0 400 420" role="img" aria-label="[^"]{20,}">/);         // rasm — role=img + aria-label
    assert.deepEqual([...html.matchAll(/class="qcard c\d" data-case="(\w+)"/g)].map(m => m[1]), ["ishdan_boshatish", "nuqsonli_tovar", "aliment", "murojaat_javobsiz"]);
    assert.equal((html.match(/<li><span class="stop s\d" aria-hidden="true">/g) || []).length, 3);
    assert.equal((html.match(/<details[ >]/g) || []).length >= 4, true);
    assert.match(html, /href="https:\/\/t\.me\/huquq_yol_bot"/);
    assert.ok(!/class="trust"|class="how"|class="howsec"|class="portals"/.test(html), `${lang}: eski bloklar olib tashlangan`);
    assert.match(html, /id="photoPanel" role="group" aria-labelledby="photoPanelT" hidden>/);   // panel yopiq, tugma kartada
  }
});

test("Footer hamma sahifada bir xil: ikat chizig‘i, shior, ogohlantirish, Yordam / Rasmiy manbalar, © va pastki havolalar", async () => {
  for (const p of ["/", "/tariflar", "/yuristlar", "/yuristlar/namuna-1", "/statistika", "/maxfiylik", "/kirish", "/royxat"]){
    const html = await (await fetch(base + p)).text();
    assert.match(html, /<footer class="sitefoot">\s*<span class="ikatf" aria-hidden="true"><\/span>/, p);
    for (const s of ["huquqingizni biling — yo‘lni birga topamiz", "Bu yuridik maslahat emas.", "Normalar 2026-yil noyabr holatiga tekshirilgan.", "© 2026 HuquqYo‘l",
      'href="https://lex.uz"', 'href="https://murojaat.gov.uz"', 'href="https://pm.gov.uz"', 'href="https://yurxizmat.uz"', 'href="/maxfiylik"', 'href="/statistika"']) assert.ok(html.includes(s), `${p}: ${s}`);
    assert.ok(/id="wipe"|href="\/\?ochirish=1"/.test(html), `${p}: «Ma’lumotlarimni o‘chirish»`);
  }
});
