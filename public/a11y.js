// Qulaylik: shrift o‘lchami va ovozli o‘qish (keksalar va ko‘rishi zaif foydalanuvchilar uchun).
// Ovoz brauzerning o‘zida sintez qilinadi (Web Speech API): matn serverga yuborilmaydi.
import { toCyrillic } from "./translit.js";

/* ---------- Shrift o‘lchami ---------- */
// 0 — oddiy, 1 — katta, 2 — juda katta, 3 — eng katta. Cookie: server sahifani shu o‘lchamda chizadi (sakrash bo‘lmaydi).
export const FS_LEVELS = 4;
const FS_COOKIE = "hy_fs";
export function getFs(){
  const v = Number(document.documentElement.dataset.fs || /(?:^|;\s*)hy_fs=([0-3])/.exec(document.cookie)?.[1] || 0);
  return v >= 0 && v < FS_LEVELS ? v : 0;
}
export function setFs(level){
  const v = Math.max(0, Math.min(FS_LEVELS - 1, Number(level) || 0));
  if (v) document.documentElement.dataset.fs = String(v); else delete document.documentElement.dataset.fs;
  document.cookie = `${FS_COOKIE}=${v}; Max-Age=${365 * 86400}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  dispatchEvent(new Event("hy:layout"));             // navbar sig‘ishi qayta tekshiriladi (public/session.js)
  return v;
}

/* ---------- Ovozli o‘qish ---------- */
const synth = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window ? window.speechSynthesis : null;
export const ttsSupported = () => !!synth;

let voices = [];
const loadVoices = () => { voices = synth ? synth.getVoices() : []; };
if (synth){ loadVoices(); synth.addEventListener?.("voiceschanged", loadVoices); }
const waitVoices = () => voices.length || !synth ? Promise.resolve() : new Promise(r => { const done = () => { loadVoices(); r(); }; synth.addEventListener?.("voiceschanged", done, { once:true }); setTimeout(done, 1200); });
const byLang = re => voices.filter(v => re.test(v.lang.replace("_", "-")));
// Tabiiy (Natural/Online) ovozlar odatda tushunarliroq
const best = list => list.find(v => /natural|online|neural/i.test(v.name)) || list.find(v => v.localService) || list[0] || null;

// Til bo‘yicha ovoz: uz → o‘zbekcha; bo‘lmasa rus ovozi (matn kirillga o‘giriladi). ru → ruscha.
export async function pickVoice(lang){
  await waitVoices();
  if (lang === "ru"){ const v = best(byLang(/^ru/i)); return v ? { voice:v, mode:"native" } : { voice:null, mode:"default" }; }
  const uz = best(byLang(/^uz/i));
  if (uz) return { voice:uz, mode:"native" };
  const ru = best(byLang(/^ru/i));
  return ru ? { voice:ru, mode:"ru" } : { voice:null, mode:"default" };
}

// O‘qish uchun matnni tozalash: belgilar, qisqartmalar, telefon raqamlari
function clean(text, lang){
  let s = String(text ?? "")
    .replace(/[↗↓→←✓✎]/g, " ")
    .replace(/\s*·\s*/g, ", ")
    .replace(/(\d)-(?=\d)/g, "$1 ")                    // 200-06-00 → «200 06 00», minus deb o‘qilmaydi
    .replace(/_{3,}/g, " ")                            // imzo chizig‘i
    .replace(/\s+/g, " ").trim();
  if (lang !== "ru") s = s.replace(/\bsh\.(?=\s|,)/g, "shahri").replace(/\bt\.(?=\s|,)/g, "tumani").replace(/\bш\.(?=\s|,)/g, "шаҳри").replace(/\bт\.(?=\s|,)/g, "тумани");
  return s;
}
// Rus ovozi o‘zbekcha kirill harflarini o‘qiy olishi uchun yaqin tovushga almashtirish
const forRuVoice = s => toCyrillic(s).replace(/ў/g, "у").replace(/Ў/g, "У").replace(/қ/g, "к").replace(/Қ/g, "К").replace(/ғ/g, "г").replace(/Ғ/g, "Г").replace(/ҳ/g, "х").replace(/Ҳ/g, "Х");

// Uzun matn gaplarga bo‘linadi: ayrim brauzerlar uzun ovozni o‘rtasida to‘xtatadi
function chunks(text, max = 220){
  const out = [];
  for (const sent of text.match(/[^.!?;:]+[.!?;:]*\s*/g) || [text]){
    let s = sent.trim(); if (!s) continue;
    while (s.length > max){ const cut = s.lastIndexOf(" ", max); const at = cut > 40 ? cut : max; out.push(s.slice(0, at)); s = s.slice(at).trim(); }
    if (s) out.push(s);
  }
  return out;
}

const READING = "tts-reading";
let session = 0, current = null;
const mark = el => { document.querySelectorAll("." + READING).forEach(x => x.classList.remove(READING)); if (el){ el.classList.add(READING);
  const r = el.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight) el.scrollIntoView({ block:"center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } };

// items: [{ text, el? }] — el o‘qilayotganda belgilanadi. onState("playing" | "paused" | "ended" | "error")
export async function speak(items, { lang = "uz", rate = 1, onState = () => {} } = {}){
  if (!synth) return { ok:false, mode:"none" };
  stop();
  const id = ++session;
  const { voice, mode } = await pickVoice(lang);
  if (id !== session) return { ok:false, mode };
  const queue = [];
  for (const it of items){
    let txt = clean(it.text, lang); if (!txt) continue;
    if (mode === "ru") txt = forRuVoice(txt);
    for (const c of chunks(txt)) queue.push({ text:c, el:it.el || null });
  }
  if (!queue.length) return { ok:false, mode };
  const langTag = lang === "ru" || mode === "ru" ? "ru-RU" : "uz-UZ";
  current = { onState };
  onState("playing");
  queue.forEach((q, i) => {
    const u = new SpeechSynthesisUtterance(q.text);
    u.lang = voice?.lang || langTag; if (voice) u.voice = voice; u.rate = rate; u.pitch = 1;
    u.onstart = () => { if (id === session) mark(q.el); };
    u.onend = () => { if (id === session && i === queue.length - 1){ mark(null); current = null; onState("ended"); } };
    u.onerror = e => { if (id === session && e.error !== "interrupted" && e.error !== "canceled"){ mark(null); current = null; onState("error"); } };
    synth.speak(u);
  });
  return { ok:true, mode };
}
export function pause(){ if (!synth || !current) return; if (synth.paused){ synth.resume(); current.onState("playing"); } else { synth.pause(); current.onState("paused"); } }
export function stop(){
  if (!synth) return;
  session++;
  const c = current; current = null;
  synth.cancel(); mark(null);
  c?.onState("ended");
}
export const isSpeaking = () => !!current;

/* ---------- Mavzu: yorug‘ / qorong‘i ---------- */
// Cookie: server keyingi sahifani shu mavzuda chizadi (<html data-theme>), ekran «miltillamaydi»
export function getTheme(){
  const d = document.documentElement.dataset.theme;
  return d === "dark" || d === "light" ? d : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}
export function setTheme(th){
  const v = th === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = v;
  document.cookie = `hy_theme=${v}; Path=/; Max-Age=${365 * 86400}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  return v;
}

/* ---------- «Aa Qulaylik» modal oynasi (barcha sahifalar) ---------- */
// Belgilash: shared.js a11yDialogHTML(). Ochish — #a11yBtn; yopish — ×, Esc, fon ustiga bosish. Fokus ichida aylanadi
// va yopilganda ochgan tugmaga qaytadi. Animatsiya CSS da (prefers-reduced-motion — animatsiyasiz).
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Server sahifalari uchun: <main> dagi ko‘rinadigan matn bloklari (ichma-ich takrorlarsiz)
const READ_SEL = "h1, h2, h3, h4, p, li, dt, dd, th, td, figcaption, summary, label, legend, .note";
export function mainItems(root = document.getElementById("main") || document.body){
  const sel = String(window.getSelection?.() || "").replace(/\s+/g, " ").trim();
  if (sel.length > 2) return [{ text: sel }];
  const out = [];
  for (const el of root.querySelectorAll(READ_SEL)){
    if (el.parentElement?.closest(READ_SEL) && root.contains(el.parentElement.closest(READ_SEL))) continue;
    if (el.closest("[hidden], [aria-hidden='true'], dialog, .sr") || !el.getClientRects().length) continue;
    const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    if (text) out.push({ text, el });
  }
  return out;
}

let mounted = null;
export function mountA11y({ lang = document.documentElement.dataset.lang || "uz", getItems = mainItems, notify } = {}){
  if (mounted) return mounted;
  const btn = document.getElementById("a11yBtn"), dlg = document.getElementById("a11yDlg"), bar = document.getElementById("ttsBar");
  if (!btn || !dlg) return null;
  const $ = s => dlg.querySelector(s), D = bar?.dataset || {};
  const fsNames = (D.fsNames || "").split("|");
  const live = document.getElementById("live") || Object.assign(document.body.appendChild(document.createElement("div")), { className: "sr", id: "live" });
  live.setAttribute("aria-live", "polite");
  const say = msg => { live.textContent = ""; setTimeout(() => { live.textContent = msg; }, 30); };
  const tell = notify || say;
  let rate = 1, warnedRu = false, closing = 0;
  try { rate = Number(localStorage.getItem("huquqyol:rate")) || 1; } catch {}

  const sync = () => {
    const fs = getFs(), th = getTheme();
    dlg.querySelectorAll("[data-fs]").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.fs) === fs)));
    dlg.querySelectorAll("[data-rate]").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.rate) === rate)));
    dlg.querySelectorAll("[data-set-theme]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.setTheme === th)));
  };

  function open(){
    if (dlg.open) return;
    clearTimeout(closing); dlg.classList.remove("out");
    sync();
    dlg.showModal();
    btn.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => dlg.classList.add("in"));
    (dlg.querySelector("[data-fs][aria-pressed='true']") || $("[data-a11y-close]")).focus();
  }
  function close(){
    if (!dlg.open) return;
    btn.setAttribute("aria-expanded", "false");
    dlg.classList.remove("in");
    const done = () => { dlg.classList.remove("out"); if (dlg.open) dlg.close(); btn.focus(); };
    if (reduced()) return done();
    dlg.classList.add("out");
    closing = setTimeout(done, 180);
  }

  // Ovoz holati: pastki panel, tugmalar (aria-pressed) va matn
  function ttsUi(st){
    const on = st === "playing" || st === "paused";
    if (bar){
      bar.hidden = !on;
      bar.querySelector("#ttsState").textContent = st === "paused" ? D.paused : D.reading;
      bar.querySelector("#ttsPause").textContent = st === "paused" ? D.resume : D.pause;
    }
    document.body.classList.toggle("speaking", on);
    document.querySelectorAll("[data-tts]").forEach(b => b.setAttribute("aria-pressed", String(on)));
    const pg = $("#ttsPage .ttslbl"); if (pg) pg.textContent = on ? $("#ttsPage").dataset.on : $("#ttsPage").dataset.off;
    if (st === "error" && D.err) tell(D.err);
  }
  async function readAloud(items){
    if (!ttsSupported()){ tell($("#ttsNote")?.dataset.none || ""); return; }
    if (isSpeaking()){ stop(); return; }                   // ikkinchi bosish — to‘xtatish
    const r = await speak(items, { lang: lang === "ru" ? "ru" : "uz", rate, onState: ttsUi });
    if (r.mode === "ru" && !warnedRu && lang !== "ru" && D.noUz){ warnedRu = true; tell(D.noUz); }
  }

  btn.setAttribute("aria-haspopup", "dialog");
  btn.setAttribute("aria-controls", "a11yDlg");
  btn.addEventListener("click", () => dlg.open ? close() : open());
  dlg.addEventListener("cancel", e => { e.preventDefault(); close(); });                 // Esc
  dlg.addEventListener("click", e => {
    if (e.target === dlg) return close();                                                  // fon (backdrop) ustiga bosish
    if (e.target.closest("[data-a11y-close]")) return close();
    const f = e.target.closest("[data-fs]");
    if (f){ const v = setFs(Number(f.dataset.fs)); sync(); say((D.fsDone || "{v}").replace("{v}", fsNames[v] || String(v))); return; }
    const r = e.target.closest("[data-rate]");
    if (r){ rate = Number(r.dataset.rate); try { localStorage.setItem("huquqyol:rate", String(rate)); } catch {} sync(); return; }
    const th = e.target.closest("[data-set-theme]");
    if (th){ setTheme(th.dataset.setTheme); sync(); return; }
    if (e.target.closest("#ttsPage")){ if (isSpeaking()) stop(); else { const items = getItems(); close(); readAloud(items); } }
  });
  // Fokus oyna ichida aylanadi (Tab / Shift+Tab)
  dlg.addEventListener("keydown", e => {
    if (e.key !== "Tab") return;
    const list = [...dlg.querySelectorAll(FOCUSABLE)].filter(x => x.getClientRects().length);
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });
  bar?.querySelector("#ttsPause")?.addEventListener("click", pause);
  bar?.querySelector("#ttsStopBtn")?.addEventListener("click", () => stop());
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !dlg.open && isSpeaking()) stop(); });
  // Navbardagi tez almashtirgich (☾/☀) — sahifani qayta yuklamasdan
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-theme-toggle]"); if (!b) return;
    e.preventDefault(); setTheme(getTheme() === "dark" ? "light" : "dark"); sync();
  });
  if (!ttsSupported()){ const n = $("#ttsNote"); if (n) n.textContent = n.dataset.none; $("#ttsPage").disabled = true; }
  sync();
  mounted = { open, close, readAloud, isOpen: () => dlg.open };
  return mounted;
}
