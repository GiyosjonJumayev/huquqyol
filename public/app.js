// HuquqYo‘l — frontend. Huquqiy mantiq serverda (/api/*); bu fayl ko‘rsatadi, saqlaydi va yo‘naltiradi.
import { toCyrillic } from "/translit.js";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const fmtSum = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmtShort = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(".", ",") + " mln" : fmtSum(n);
const iso = d => { const z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
const monthsAgo = n => { const d = new Date(); d.setHours(0,0,0,0); d.setMonth(d.getMonth() - n); return d; };
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const KEY = "huquqyol:v2";
const store = {
  load(){ try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } },
  save(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} },
  clear(){ try { localStorage.removeItem(KEY); } catch {} }
};
function announce(msg){ msg = typeof T === "function" ? T(msg) : msg; const l = $("#live"); l.textContent = ""; setTimeout(() => { l.textContent = msg; }, 30); }
function toast(msg){ const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; ($("#main") || document.body).append(t); announce(msg); setTimeout(() => t.remove(), 2800); }

async function api(path, body){
  let res;
  try {
    res = await fetch(path, body === undefined ? {} : { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  } catch { throw new Error("Internet aloqasi yo‘q yoki server ishlamayapti."); }
  if (!res.ok){ let msg = "Server javob bermadi. Qayta urinib ko‘ring."; try { msg = (await res.json()).error || msg; } catch {} throw new Error(msg); }
  return res;
}
const getJSON = async (p, b) => (await api(p, b)).json();

const SVG = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICONS = {
  mehnat: SVG('<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>'),
  istemol: SVG('<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  oila: SVG('<circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="7" r="2.5"/><circle cx="12" cy="13" r="2"/><path d="M3.5 20c0-3 2-5 4.5-5M20.5 20c0-3-2-5-4.5-5M9 21c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5"/>'),
  davlat: SVG('<path d="M3 9l9-5 9 5"/><path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9"/><path d="M3 21h18"/>'),
  jarima: SVG('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
  fuqarolik: SVG('<circle cx="9" cy="9" r="5"/><path d="M9 7v4M7.5 9h3"/><path d="M14.5 4.6A5 5 0 1 1 13 19"/><path d="M3 21h8"/>')
};
const EXAMPLES = [
  "Ish beruvchim 3 oydan beri maosh bermayapti, qarzi 9 million so‘m",
  "«Texnomart» do‘konidan olgan televizor 2 haftada buzildi, almashtirmayapti",
  "Sobiq erim 2 ta bolamga aliment to‘lamayapti",
  "Hokimlikka murojaat qildim, bir oydan beri javob yo‘q",
  "YHXB radar bo‘yicha noto‘g‘ri jarima soldi",
  "Do‘stimga qarzga bergan 20 million so‘mni qaytarmayapti, tilxat bor"
];
const ROUTES = { 1:"vaziyat", 2:"reja", 3:"ariza" };

/* ---------- Yozuv: lotin / kirill ----------
   Interfeys matni lotinda yoziladi; kirill rejimida DOM matnlari avtomatik o‘giriladi.
   Asl matn WeakMap’da saqlanadi, shuning uchun lotinga qaytish yo‘qotishsiz. */
const LANG_KEY = "huquqyol:lang";
let lang = (() => { try { return localStorage.getItem(LANG_KEY) === "cyr" ? "cyr" : "lat"; } catch { return "lat"; } })();
const orig = new WeakMap(), origAttr = new WeakMap();
const ATTRS = ["placeholder", "aria-label", "title"];
const skip = el => !el || el.closest("[data-notr], textarea, script, style, #paper");
function convertTree(root){
  if (lang !== "cyr") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.currentNode.nodeType === 3 ? walker.currentNode : walker.nextNode(); n; n = walker.nextNode()){
    if (skip(n.parentElement) || !/[A-Za-z]/.test(n.data)) continue;
    if (!orig.has(n)) orig.set(n, n.data);
    n.data = toCyrillic(orig.get(n));
  }
  const els = root.nodeType === 1 ? [root, ...root.querySelectorAll("*")] : [];
  for (const el of els){
    if (skip(el) && !el.matches("input, textarea")) continue;
    for (const a of ATTRS){
      const v = el.getAttribute(a); if (!v || !/[A-Za-z]/.test(v)) continue;
      const m = origAttr.get(el) || {}; if (!(a in m)) m[a] = v; origAttr.set(el, m);
      el.setAttribute(a, toCyrillic(m[a]));
    }
  }
}
function restoreTree(root){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (orig.has(n)){ n.data = orig.get(n); orig.delete(n); }
  for (const el of root.querySelectorAll("*")){ const m = origAttr.get(el); if (m){ for (const [a, v] of Object.entries(m)) el.setAttribute(a, v); origAttr.delete(el); } }
}
const observer = new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 || n.nodeType === 3) convertTree(n.nodeType === 3 ? n.parentNode : n); });
observer.observe(document.body, { childList:true, subtree:true });
const T = s => lang === "cyr" ? toCyrillic(s) : s;   // dinamik satrlar uchun (title, toast)
function setLang(l){
  lang = l;
  try { localStorage.setItem(LANG_KEY, l); } catch {}
  document.documentElement.lang = l === "cyr" ? "uz-Cyrl" : "uz";
  document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === l)));
  if (l === "cyr") convertTree(document.body); else restoreTree(document.body);
  previewDoc();
}

// Ariza beruvchi ma’lumotlari (F.I.Sh., manzil, telefon) umumiy; qolgan maydonlar har bir holat uchun alohida saqlanadi,
// shunda bir holatdagi «summa» boshqasiga o‘tib ketmaydi.
const state = { meta:null, analysis:null, scn:null, plan:null, trigger:null, recipient:null, applicant:{}, formByScn:{}, evidence:[], blocks:[], missing:[], domain:null };
const persist = () => store.save({ analysis:state.analysis, scn:state.scn, trigger:state.trigger, recipient:state.recipient, applicant:state.applicant, formByScn:state.formByScn, evidence:state.evidence, at:Date.now() });
const scenarioMeta = id => state.meta.scenarios.find(s => s.id === id);
const isApplicant = k => state.meta.applicant.some(f => f.k === k);
const form = () => ({ ...state.applicant, ...(state.formByScn[state.scn] || {}) });
function setField(k, v){
  if (isApplicant(k)) state.applicant[k] = v;
  else (state.formByScn[state.scn] ||= {})[k] = v;
}
const fieldSpec = k => [...state.meta.applicant, ...(scenarioMeta(state.scn)?.fields || []), { k:"extra", type:"textarea" }].find(f => f.k === k);

/* ---------- Navigatsiya (brauzer "orqaga" tugmasi ishlaydi) ---------- */
function go(n, { push = true } = {}){
  if (n > 1 && !state.plan) n = 1;
  [1,2,3].forEach(i => { $("#v" + i).hidden = i !== n; });
  document.querySelectorAll(".stepper button").forEach(b => {
    const i = Number(b.dataset.go);
    b.disabled = i > 1 && !state.plan;
    if (i === n) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    b.classList.toggle("done", i < n);
  });
  if (push && location.hash !== "#" + ROUTES[n]) history.pushState(null, "", "#" + ROUTES[n]);
  window.scrollTo({ top:0 });
  const h = $(`#v${n} h1`); if (h){ h.setAttribute("tabindex", "-1"); h.focus({ preventScroll:true }); }
  document.title = "HuquqYo‘l — " + T(["Vaziyat","Reja","Ariza"][n - 1]);
}
window.addEventListener("popstate", () => {
  const n = Number(Object.keys(ROUTES).find(k => "#" + ROUTES[k] === location.hash)) || 1;
  go(n, { push:false });
});

/* ---------- 1. Vaziyat ---------- */
function renderStart(){
  renderDomains();
  $("#examples").innerHTML = EXAMPLES.map((e, i) => `<button class="chipbtn" type="button" data-ex="${i}">${esc(e)}</button>`).join("");
  $("#aiDot").classList.toggle("on", state.meta.ai);
  $("#aiText").textContent = state.meta.ai ? "AI tahlil: Claude" : "Qidiruv tahlili";
}
function renderDomains(){
  state.domain = null;
  $("#pickHead").hidden = true;
  $("#cases").className = "domains";
  $("#cases").innerHTML = state.meta.domains.map(d => {
    const n = state.meta.scenarios.filter(s => s.domain === d.id).length;
    return `<button class="case domain" type="button" data-domain="${d.id}"><span class="ic">${ICONS[d.id] || ""}</span><span><b>${esc(d.title)}</b><span>${esc(d.desc)}</span><span class="count">${n} ta holat →</span></span></button>`;
  }).join("");
}
function renderDomain(id){
  const d = state.meta.domains.find(x => x.id === id); if (!d) return renderDomains();
  state.domain = id;
  $("#pickHead").hidden = false;
  $("#pickHead").innerHTML = `<button class="back" type="button" id="allDomains">← Barcha sohalar</button><h2>${esc(d.title)}</h2>`;
  $("#cases").className = "domains list";
  $("#cases").innerHTML = state.meta.scenarios.filter(s => s.domain === id).map(s => `
    <button class="case" type="button" data-case="${s.id}"><span class="ic">${ICONS[s.domain] || ""}</span><span><b>${esc(s.title)}</b><span>${esc(s.card)}</span></span></button>`).join("");
  $("#cases .case")?.focus();
}

function renderResume(saved){
  const s = saved?.scn && scenarioMeta(saved.scn);
  if (!s) return;
  const el = $("#resume");
  el.innerHTML = `<span>Oldingi ishingiz: <b>${esc(s.title)}</b></span>
    <span class="acts"><button class="btn primary sm" type="button" id="resumeGo">Davom etish</button><button class="btn ghost sm" type="button" id="resumeNew">Yangidan boshlash</button></span>`;
  el.hidden = false;
  $("#resumeGo").onclick = async () => { el.hidden = true; Object.assign(state, saved); await refreshPlan(true); renderDocView(); go(2); };
  $("#resumeNew").onclick = () => { el.hidden = true; store.clear(); state.formByScn = {}; };
}

async function analyze(){
  const text = $("#problem").value.trim(), btn = $("#analyzeBtn"), err = $("#askErr");
  err.hidden = true;
  if (text.length < 8){ err.textContent = "Vaziyatni bir-ikki gap bilan yozing: kim, nima qildi, qachondan beri."; err.hidden = false; $("#problem").focus(); return; }
  btn.disabled = true; btn.innerHTML = `<span class="spin" aria-hidden="true"></span> Tahlil qilinmoqda…`;
  announce("Tahlil qilinmoqda");
  try { await choose(await getJSON("/api/analyze", { text })); }
  catch (e){ err.textContent = e.message; err.hidden = false; }
  finally { btn.disabled = false; btn.textContent = "Tahlil qilish"; }
}

function defaultTrigger(m, facts){
  if (facts.eventDate) return facts.eventDate;
  if (m.id === "ish_haqi" && Number(facts.form?.months) > 0) return iso(monthsAgo(Number(facts.form.months)));
  const short = m.deadline?.days || m.deadline?.none;          // qisqa muddatli holatlarda bugungi sana
  return iso(short ? new Date() : monthsAgo(1));
}
async function choose(a){
  state.analysis = a;
  $("#resume").hidden = true;
  if (a.scenario === "boshqa"){ renderOut(); return; }
  const m = scenarioMeta(a.scenario), facts = a.facts || {};
  state.scn = a.scenario;
  state.trigger = defaultTrigger(m, facts);
  const own = state.formByScn[state.scn] ||= {};
  for (const [k, v] of Object.entries(facts.form || {})) if (!own[k] && v) own[k] = v;   // foydalanuvchi yozganini ustidan yozmaymiz
  state.evidence = [];
  if (!m.docs.some(d => d.id === state.recipient)) state.recipient = m.docs[0].id;
  $("#v2").innerHTML = `<div class="skeleton" aria-hidden="true"></div>`;
  await refreshPlan(true);
  renderDocView();
  persist();
  go(2);
}

function renderOut(){
  const a = state.analysis;
  state.plan = null;
  $("#v2").innerHTML = `<button class="back" type="button" data-go="1">← Orqaga</button>
    <div class="case-head"><span class="tag">Doiradan tashqarida</span><h1>Bu holatni hozircha qamramaymiz</h1>
    <p>HuquqYo‘l hozir ${state.meta.domains.length} ta sohada yordam beradi: ${esc(state.meta.domains.map(d => d.title.toLowerCase()).join(", "))}. ${a.summary ? esc(a.summary) + " " : ""}Ro‘yxatdan sohani tanlab ko‘ring yoki bepul yuridik yordam markazi va advokatga murojaat qiling.</p></div>`;
  [1,3].forEach(i => $("#v" + i).hidden = true); $("#v2").hidden = false;
  history.pushState(null, "", "#reja"); window.scrollTo({ top:0 }); $("#v2 h1").setAttribute("tabindex","-1"); $("#v2 h1").focus();
}

/* ---------- 2. Reja ---------- */
async function refreshPlan(full){
  state.plan = await getJSON("/api/plan", { scenario: state.scn, triggerDate: state.trigger, form: cleanForm() });
  if (full) renderPlan(); else { renderDeadline(); renderRoute(); renderCalc(); }
  persist();
}

const badge = n => n.article ? `<span class="art">${esc(n.article)}</span>` : `<span class="art law-only">Qonun</span>`;
function calcInput(f){
  const v = form()[f.k] || "";
  const attrs = f.type === "date" ? `type="date" max="${iso(new Date())}"` : `inputmode="numeric" autocomplete="off"`;
  const val = f.type === "money" && v ? fmtSum(v) : v;
  return `<div class="field"><label for="c_${f.k}">${esc(f.label)}</label><input id="c_${f.k}" data-ck="${f.k}" data-type="${f.type}" ${attrs} value="${esc(val)}"></div>`;
}
function renderPlan(){
  const p = state.plan, a = state.analysis || {}, info = p.info, m = scenarioMeta(state.scn);
  const focus = new Set(a.normIds || []);
  const law = n => `<div class="law">${badge(n)}<div><b>${esc(n.title)}${focus.has(n.id) ? ' <span class="tag">siz uchun</span>' : ""}</b><p>${esc(n.text)}</p><span class="lawsrc">${esc(n.lawName)}</span></div></div>`;
  const source = a.source === "ai" ? "Claude tahlili" : a.source === "rules" ? "Avtomatik tahlil" : "Siz tanladingiz";
  const n0 = p.norms[0];
  const laws = [...new Map(p.norms.map(n => [n.law, { name:n.lawName, url:n.lawUrl }])).values()];
  const calcFields = m.fields.filter(f => f.calc);
  $("#v2").innerHTML = `
    <button class="back" type="button" data-go="1">← Boshqa vaziyat</button>
    <div class="case-head">
      <span class="tag">${esc(state.meta.domains.find(d => d.id === info.domain)?.title || "")} · ${esc(info.short)} · ${esc(source)}</span>
      <h1>${esc(info.title)}</h1>
      <p>${esc(a.summary || info.lead)}</p>
      ${a.missing?.length ? `<p class="small warnline">Arizaga kerak bo‘ladi: ${a.missing.map(esc).join(", ")}</p>` : ""}
    </div>
    <div class="summary">
      <div class="card" id="deadlineCard"></div>
      ${p.calc ? `<div class="card" id="calcCard">
        <div class="kicker" id="calcTitle"></div>
        <div class="money" id="calcValue">—</div>
        <div class="small muted" id="calcNote"></div>
        <div class="calcrows" id="calcRows" hidden></div>
        <div class="inline">${calcFields.map(calcInput).join("")}</div></div>`
      : `<div class="card"><div class="kicker">Sizning asosiy huquqingiz</div>
        <div class="money right">${esc(n0.title)}</div>
        <p class="small muted">${esc(n0.text)}</p>
        <div class="src">${badge(n0)} <span class="lawsrc">${esc(n0.lawName)}</span></div></div>`}
    </div>
    <h2 class="sec">Nima qilish kerak</h2>
    <ol class="steps" id="route"></ol>
    <h2 class="sec">Qonun nima deydi</h2>
    <div class="laws">${p.norms.slice(0, 3).map(law).join("")}</div>
    ${p.norms.length > 3 ? `<details class="more"><summary>Yana ${p.norms.length - 3} ta norma</summary><div class="laws">${p.norms.slice(3).map(law).join("")}</div></details>` : ""}
    <div class="sources">${laws.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.name)} — lex.uz ↗</a>`).join("")}</div>
    <h2 class="sec">Dalillarni to‘plang <span class="small muted evcount" id="evCount"></span></h2>
    <p class="small muted evhint">Belgilaganlaringiz arizaning «Ilovalar» ro‘yxatiga qo‘shiladi.</p>
    <ul class="evid" id="evid">${p.evidence.map((e, i) => `<li><label><input type="checkbox" data-i="${i}" ${state.evidence.includes(i) ? "checked" : ""}> ${esc(e)}</label></li>`).join("")}</ul>
    <div class="cta"><button class="btn primary" type="button" data-go="3">Ariza tayyorlash →</button></div>`;
  renderDeadline(); renderRoute(); renderCalc(); renderEvCount();
  $("#evid").addEventListener("change", e => {
    const i = Number(e.target.dataset.i); if (Number.isNaN(i)) return;
    state.evidence = e.target.checked ? [...new Set([...state.evidence, i])] : state.evidence.filter(x => x !== i);
    renderEvCount(); persist(); previewDoc();
  });
  const onCalc = debounce(() => { refreshPlan(false).then(previewDoc).catch(e => toast(e.message)); }, 300);
  $("#calcCard")?.addEventListener("input", e => {
    const k = e.target.dataset.ck; if (!k) return;
    let v = e.target.value;
    if (e.target.dataset.type === "money"){ v = v.replace(/\D/g, "").slice(0, 13); e.target.value = v ? fmtSum(v) : ""; }
    if (e.target.dataset.type === "int") v = v.replace(/\D/g, "").slice(0, 2);
    setField(k, v); persist();
    const df = $("#f_" + k); if (df) df.value = e.target.value;
    onCalc();
  });
}

function renderDeadline(){
  const p = state.plan, cls = { low:"lv-ok", medium:"lv-warn", high:"lv-bad", expired:"lv-bad", info:"lv-ok" }[p.risk.level];
  const head = `<div class="cardhead"><div class="kicker">${esc(p.deadlineLabel)}</div><span class="pill ${cls}">${esc(p.risk.label)}</span></div>`;
  const date = `<div class="inline"><div class="field"><label for="trigger">${esc(p.info.trigger)}</label><input type="date" id="trigger" value="${esc(p.trigger)}" max="${iso(new Date())}"></div></div>`;
  $("#deadlineCard").innerHTML = p.deadline == null ? `${head}
    <div class="big word">Muddatsiz</div>
    <div class="small tip">${esc(p.deadlineNote)}</div>${date}` : `${head}
    <div class="big">${Math.abs(p.daysLeft)}<small>${p.daysLeft < 0 ? "kun kechikdi" : "kun"}</small></div>
    <div class="small muted">Oxirgi kun: <b class="ink">${esc(p.deadlineText)}</b> · ${esc(p.deadlineTerm)} muddat</div>
    <div class="bar ${cls}" role="progressbar" aria-label="O‘tgan muddat" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p.progress * 100)}"><i style="width:${Math.round(p.progress * 100)}%"></i></div>
    <div class="small tip">${esc(p.risk.tip)}</div>
    ${p.deadlineNote ? `<div class="small muted dnote">${esc(p.deadlineNote)}</div>` : ""}${date}`;
  $("#trigger").addEventListener("change", e => {
    if (!e.target.value) return;
    state.trigger = e.target.value;
    refreshPlan(false).then(previewDoc).catch(err => { toast(err.message); });
  });
}

function renderRoute(){
  $("#route").innerHTML = state.plan.steps.map((st, i) => `
    <li><span class="num" aria-hidden="true">${i + 1}</span><div class="body">
      <div class="row"><div><div class="org">${esc(st.org)}</div><h3>${esc(st.t)}</h3></div>
      <span class="when ${st.hot ? "hot" : ""}">${esc(st.when)}</span></div>
      <p>${esc(st.body)}</p></div></li>`).join("");
}

function renderCalc(){
  const c = state.plan.calc; if (!c || !$("#calcValue")) return;
  $("#calcTitle").textContent = c.title;
  $("#calcValue").textContent = c.value;
  $("#calcNote").textContent = c.note || "";
  const rows = $("#calcRows");
  rows.hidden = !c.rows;
  rows.innerHTML = (c.rows || []).map(([a, b]) => `<div><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join("");
}
function renderEvCount(){ $("#evCount").textContent = `· ${state.evidence.length} / ${state.plan.evidence.length} bor`; }

/* ---------- 3. Ariza ---------- */
function fieldHTML(f){
  const v = form()[f.k] || "", hidden = f.docs && !f.docs.includes(state.recipient);
  const ph = esc(f.hint || "");
  let input;
  if (f.type === "textarea") input = `<textarea id="f_${f.k}" data-k="${f.k}" placeholder="${ph}" maxlength="1500">${esc(v)}</textarea>`;
  else if (f.type === "select") input = `<select id="f_${f.k}" data-k="${f.k}"><option value="">— tanlang —</option>${f.options.map(o => `<option value="${esc(o.v)}" ${o.v === v ? "selected" : ""}>${esc(o.text)}</option>`).join("")}</select>`;
  else {
    const t = { phone:'type="tel" inputmode="tel" autocomplete="tel"', money:'inputmode="numeric" autocomplete="off"', int:'inputmode="numeric" autocomplete="off"', date:`type="date" max="${iso(new Date())}"` }[f.type]
      || ({ fio:'autocomplete="name"', address:'autocomplete="street-address"' }[f.k] || 'autocomplete="off"');
    input = `<input id="f_${f.k}" data-k="${f.k}" data-type="${f.type}" placeholder="${ph}" value="${esc(f.type === "money" && v ? fmtSum(v) : v)}" ${t} maxlength="200">`;
  }
  return `<div class="field" data-f="${f.k}" ${hidden ? "hidden" : ""}><label for="f_${f.k}">${esc(f.label)}</label>${input}<span class="err" id="e_${f.k}" hidden></span></div>`;
}
function renderDocView(){
  const m = scenarioMeta(state.scn);
  $("#seg").innerHTML = m.docs.map(d => `<button type="button" data-r="${d.id}" aria-pressed="${d.id === state.recipient}">${esc(d.label)}</button>`).join("");
  const groups = new Map();
  for (const f of m.fields) if (!(f.docs && f.docs.length === 0)) { const g = f.group || "Ma’lumotlar"; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(f); }
  const extra = form().extra || "";
  $("#docForm").innerHTML = `
    <fieldset><legend>Siz haqingizda</legend>${state.meta.applicant.map(fieldHTML).join("")}</fieldset>
    ${[...groups].map(([g, fs]) => `<fieldset><legend>${esc(g)}</legend>${fs.map(fieldHTML).join("")}</fieldset>`).join("")}
    <details class="more" ${extra ? "open" : ""}><summary>+ Qo‘shimcha holatlar</summary>
      <div class="field"><label for="f_extra">Ariza matniga qo‘shiladi</label><textarea id="f_extra" data-k="extra" maxlength="1500">${esc(extra)}</textarea></div></details>`;
  previewDoc();
}
function syncVisibility(){
  for (const f of scenarioMeta(state.scn).fields){ const el = document.querySelector(`[data-f="${f.k}"]`); if (el) el.hidden = !!(f.docs && !f.docs.includes(state.recipient)); }
}

// Noto‘g‘ri kiritilgan maydon serverga yuborilmaydi (xato faqat maydon ostida ko‘rsatiladi)
function cleanForm(){
  const out = {};
  for (const [k, v] of Object.entries(form())){ const f = fieldSpec(k); if (f && v !== "" && v != null && !validateField(f, String(v))) out[k] = v; }
  return out;
}
const docRequest = () => ({ scenario: state.scn, recipient: state.recipient, triggerDate: state.trigger, form: cleanForm(), evidence: state.evidence, lang });

let previewSeq = 0;
async function previewDoc(){
  if (!state.plan) return;
  const seq = ++previewSeq;
  try {
    const m = await getJSON("/api/document/preview", docRequest());
    if (seq !== previewSeq) return;                       // eskirgan javobni tashlab yuborish
    state.blocks = m.blocks; state.missing = m.missing || [];
    $("#paper").innerHTML = m.blocks.map(blockHTML).join("");
    renderMissing();
  } catch (e){ if (seq === previewSeq) toast(e.message); }
}
function renderMissing(){
  const el = $("#missing"), n = state.missing.length;
  el.hidden = false;
  el.classList.toggle("okay", n === 0);
  el.textContent = n === 0 ? "✓ Barcha joylar to‘ldirilgan" : `${n} ta joy to‘ldirilmagan: ${state.missing.map(x => x.label).join(", ")} — to‘ldirish`;
  document.querySelectorAll(".field.need").forEach(f => f.classList.remove("need"));
  state.missing.forEach(x => document.querySelector(`[data-f="${x.k}"]`)?.classList.add("need"));
}
const partsHTML = ps => ps.map(p => p.v != null ? esc(p.v) : `<span class="ph">${esc(p.ph)}</span>`).join("");
const partsText = ps => ps.map(p => p.v ?? `[${p.ph}]`).join("");
function blockHTML(b){
  switch (b.t){
    case "addr": return `<div class="addr">${b.lines.map(l => `<div>${partsHTML(l)}</div>`).join("")}</div>`;
    case "title": return `<div class="ttl">${esc(b.text)}</div>`;
    case "sub": return `<div class="sub">${esc(b.text)}</div>`;
    case "p": return `<p>${partsHTML(b.parts)}</p>`;
    case "lbl": return `<p class="lbl">${esc(b.text)}</p>`;
    case "list": return `<ol>${b.items.map(i => `<li>${partsHTML(i)}</li>`).join("")}</ol>`;
    case "sign": return `<div class="sign"><span>${esc(b.left)}</span><span>${partsHTML(b.right)}</span></div>`;
  }
  return "";
}
function docText(){
  return state.blocks.map(b => {
    if (b.t === "addr") return b.lines.map(l => "\t\t\t\t" + partsText(l)).join("\n") + "\n";
    if (b.t === "title") return "\n" + b.text;
    if (b.t === "sub" || b.t === "lbl") return b.text;
    if (b.t === "p") return "\t" + partsText(b.parts);
    if (b.t === "list") return b.items.map((i, n) => `${n + 1}. ${partsText(i)}`).join("\n");
    if (b.t === "sign") return "\n" + b.left + "\t\t\t" + partsText(b.right);
    return "";
  }).join("\n");
}

function validateField(f, v){
  if (!v) return "";
  if (f.type === "phone" && !/^[+\d\s()-]{7,40}$/.test(v)) return "Faqat raqam, +, bo‘sh joy va qavs. Masalan: +998 90 123 45 67";
  if ((f.type === "money" || f.type === "int") && !/^[\d\s\u00A0]+$/.test(v)) return "Faqat raqam kiriting.";
  if (f.type === "int" && (Number(v) < (f.min ?? 0) || Number(v) > (f.max ?? 1000))) return `${f.min ?? 0} dan ${f.max ?? 1000} gacha son kiriting.`;
  if (f.type === "date" && v > iso(new Date())) return "Sana kelajakda bo‘lishi mumkin emas.";
  return "";
}
function formValid(){
  let ok = true;
  for (const el of document.querySelectorAll("#docForm [data-k]")){
    const f = fieldSpec(el.dataset.k); if (!f) continue;
    const msg = validateField(f, el.value.trim()), e = $("#e_" + f.k);
    if (e){ e.textContent = msg; e.hidden = !msg; }
    el.setAttribute("aria-invalid", String(!!msg));
    if (msg) ok = false;
  }
  return ok;
}

async function download(fmt){
  if (!formValid()){ toast("Qizil bilan belgilangan maydonni tuzating"); return; }
  const btn = fmt === "docx" ? $("#dlDocx") : $("#dlPdf"), label = btn.textContent;
  btn.disabled = true; btn.innerHTML = `<span class="spin" aria-hidden="true"></span> ${esc(label)}`;
  try {
    const res = await api(`/api/document/${fmt}`, docRequest());
    const name = (res.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/)?.[1] || `HuquqYol.${fmt}`;
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href:url, download:name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(state.missing.length ? `${fmt.toUpperCase()} yuklandi. ${state.missing.length} ta joyni qo‘lda to‘ldiring.` : `${fmt.toUpperCase()} yuklab olindi`);
  } catch (e){ toast(e.message); }
  finally { btn.disabled = false; btn.textContent = label; }
}

/* ---------- Hodisalar ---------- */
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]");
  if (g && !g.disabled){ go(Number(g.dataset.go)); return; }
  const c = e.target.closest("[data-case]");
  if (c){ choose({ scenario:c.dataset.case, confidence:1, summary:"", facts:{ form:{} }, source:"choice" }).catch(err => toast(err.message)); return; }
  const dm = e.target.closest("[data-domain]");
  if (dm){ renderDomain(dm.dataset.domain); return; }
  if (e.target.closest("#allDomains")){ renderDomains(); $("#cases .case")?.focus(); return; }
  const ex = e.target.closest("[data-ex]");
  if (ex){ $("#problem").value = EXAMPLES[ex.dataset.ex]; $("#problem").focus(); return; }
  const lb = e.target.closest("[data-lang]");
  if (lb){ setLang(lb.dataset.lang); return; }
  const r = e.target.closest("#seg button");
  if (r){
    state.recipient = r.dataset.r; persist();
    document.querySelectorAll("#seg button").forEach(b => b.setAttribute("aria-pressed", String(b === r)));
    syncVisibility();
    previewDoc();
  }
});
const onForm = debounce(previewDoc, 220);
const onDocCalc = debounce(() => refreshPlan(false).catch(() => {}), 300);
function onDocInput(e){
  const k = e.target.dataset.k; if (!k) return;
  const f = fieldSpec(k);
  let v = e.target.value;
  if (f?.type === "money"){ v = v.replace(/\D/g, "").slice(0, 13); e.target.value = v ? fmtSum(v) : ""; }
  setField(k, v); persist(); onForm();
  const c = $("#c_" + k); if (c) c.value = e.target.value;
  if (f?.calc) onDocCalc();
}
$("#docForm").addEventListener("input", onDocInput);
$("#docForm").addEventListener("change", e => { if (e.target.tagName === "SELECT" || e.target.type === "date") onDocInput(e); });
$("#docForm").addEventListener("focusout", e => { const f = fieldSpec(e.target.dataset?.k); if (f && ["phone","money","int","date"].includes(f.type)) formValid(); });
$("#missing").addEventListener("click", () => {
  const el = state.missing.map(x => $("#f_" + x.k)).find(el => el && !el.closest("[hidden]"));
  if (el){ el.closest("details")?.setAttribute("open", ""); el.scrollIntoView({ block:"center" }); el.focus(); }
});
$("#home").addEventListener("click", () => go(1));
$("#analyzeBtn").addEventListener("click", analyze);
$("#problem").addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) analyze(); });
$("#dlDocx").addEventListener("click", () => download("docx"));
$("#dlPdf").addEventListener("click", () => download("pdf"));
$("#printBtn").addEventListener("click", () => window.print());
$("#copyTxt").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(docText()); toast("Matn nusxalandi"); }
  catch { const rg = document.createRange(); rg.selectNodeContents($("#paper")); const s = getSelection(); s.removeAllRanges(); s.addRange(rg); toast("Matn belgilandi: Ctrl+C bosing"); }
});
$("#wipe").addEventListener("click", () => { store.clear(); try { localStorage.removeItem("huquqyol:v1"); } catch {} state.applicant = {}; state.formByScn = {}; toast("Ma’lumotlaringiz o‘chirildi"); setTimeout(() => { location.href = location.pathname; }, 600); });

/* ---------- Oflayn (PWA) ---------- */
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
window.addEventListener("offline", () => toast("Internet uzildi. Ma’lumotlaringiz saqlanadi, aloqa tiklanganda davom eting."));
window.addEventListener("online", () => toast("Aloqa tiklandi"));

/* ---------- Boshlash ---------- */
if (lang === "cyr") setLang("cyr");
try {
  state.meta = await getJSON("/api/meta");
  renderStart();
  const saved = store.load();
  if (saved){ state.applicant = saved.applicant || {}; state.formByScn = saved.formByScn || {}; }
  const want = location.hash.slice(1);
  if (saved?.scn && scenarioMeta(saved.scn) && (want === "reja" || want === "ariza")){
    Object.assign(state, saved);
    await refreshPlan(true); renderDocView();
    go(want === "ariza" ? 3 : 2, { push:false });
  } else {
    history.replaceState(null, "", "#vaziyat");
    renderResume(saved);
  }
} catch (e){
  $("#cases").innerHTML = `<p class="error" role="alert">Server bilan bog‘lanib bo‘lmadi: ${esc(e.message)}</p>`;
}
