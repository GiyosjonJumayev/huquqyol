// HuquqYo‘l — frontend. Barcha huquqiy mantiq serverda (/api/*); bu fayl faqat ko‘rsatadi.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const fmtSum = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmtShort = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(".", ",") + " mln" : fmtSum(n);
const iso = d => { const z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
const monthsAgo = n => { const d = new Date(); d.setHours(0,0,0,0); d.setMonth(d.getMonth() - n); return d; };
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const store = {
  get(k){ try { return JSON.parse(localStorage.getItem("hy:" + k)); } catch { return null; } },
  set(k, v){ try { localStorage.setItem("hy:" + k, JSON.stringify(v)); } catch {} }
};
function toast(msg){ const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2600); }

async function api(path, body){
  const res = await fetch(path, body === undefined ? {} : { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  if (!res.ok){ let msg = "Server bilan bog‘lanib bo‘lmadi."; try { msg = (await res.json()).error || msg; } catch {} throw new Error(msg); }
  return res;
}
const getJSON = async (p, b) => (await api(p, b)).json();

const ICONS = {
  ish_haqi:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.4"/><path d="M7 3.5h10"/></svg>',
  ishdan_boshatish:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M9 16l-4-4 4-4"/><path d="M5 12h10"/></svg>',
  tatil:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="4"/><path d="M12 2v1.5M12 16.5V18M4 10H2.5M21.5 10H20M6.3 4.3l1 1M16.7 14.7l1 1M6.3 15.7l1-1M16.7 5.3l1-1"/><path d="M3 21c3-1.5 6-1.5 9 0s6 1.5 9 0"/></svg>',
  hisob_kitob:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h6M9 16h4"/></svg>'
};
const FIELDS = {
  you:[["fio","F.I.Sh.","Karimov Aziz Botirovich"],["address","Yashash manzili","Toshkent sh., Chilonzor t., …"],["phone","Telefon","+998 90 123 45 67"]],
  work:[["employer","Ish beruvchi","«…» MChJ"],["position","Lavozimingiz","omborchi"],["boss","Rahbar F.I.Sh.","direktor"],["district","Tuman yoki shahar","Chilonzor tumani"],["empAddress","Ish beruvchi manzili (sud uchun)",""]]
};

const state = { meta:null, analysis:null, scn:null, plan:null, trigger:null, recipient:"employer", form: store.get("form") || {}, evidence:{}, blocks:[] };

/* ---------- Navigatsiya ---------- */
function go(n){
  if (n > 1 && !state.plan) return;
  [1,2,3].forEach(i => { $("#v" + i).hidden = i !== n; });
  document.querySelectorAll(".stepper button").forEach(b => {
    const i = Number(b.dataset.go);
    b.disabled = i > 1 && !state.plan;
    if (i === n) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    b.classList.toggle("done", i < n);
  });
  window.scrollTo({ top:0 });
}

/* ---------- 1. Vaziyat ---------- */
function renderCases(){
  $("#cases").innerHTML = state.meta.scenarios.map(s => `
    <button class="case" type="button" data-case="${s.id}"><span class="ic">${ICONS[s.id] || ""}</span><span><b>${esc(s.title)}</b><span>${esc(s.card)}</span></span></button>`).join("");
  $("#aiDot").classList.toggle("on", state.meta.ai);
  $("#aiText").textContent = state.meta.ai ? "AI tahlil: Claude" : "Qidiruv tahlili (AI kaliti yo‘q)";
}

async function analyze(){
  const text = $("#problem").value.trim(), btn = $("#analyzeBtn"), err = $("#askErr");
  err.hidden = true;
  if (text.length < 8){ $("#problem").focus(); toast("Vaziyatni bir-ikki gap bilan yozing"); return; }
  btn.disabled = true; btn.innerHTML = `<span class="spin"></span> Tahlil qilinmoqda…`;
  try { await choose(await getJSON("/api/analyze", { text })); }
  catch (e){ err.textContent = e.message; err.hidden = false; }
  finally { btn.disabled = false; btn.textContent = "Tahlil qilish"; }
}

async function choose(a){
  state.analysis = a;
  if (a.scenario === "boshqa"){ renderOut(); return; }
  const f = a.facts || {};
  state.scn = a.scenario;
  state.trigger = f.eventDate || iso(f.months && a.scenario === "ish_haqi" ? monthsAgo(f.months) : monthsAgo(1));
  for (const k of ["employer","position"]) if (f[k]) state.form[k] = f[k];
  if (f.amount) state.form.amount = String(f.amount);
  if (f.months) state.form.months = String(f.months);
  state.evidence = {};
  const docs = state.meta.scenarios.find(s => s.id === a.scenario).documents;
  if (!docs.includes(state.recipient)) state.recipient = docs[0];
  await refreshPlan(true);
  renderDocView();
  go(2);
}

function renderOut(){
  const a = state.analysis;
  state.plan = null;
  $("#v2").innerHTML = `<button class="back" type="button" data-go="1">← Orqaga</button>
    <div class="case-head"><span class="tag">Doiradan tashqarida</span><h2>Bu holatni hozircha qamramaymiz</h2>
    <p>HuquqYo‘l hozir mehnat nizolarida yordam beradi: ish haqi, ishdan bo‘shatish, ta’til va hisob-kitob. ${a.summary ? esc(a.summary) : "Vaziyatni ish beruvchi yoki maosh bilan bog‘lab batafsilroq yozing yoki advokatga murojaat qiling."}</p></div>`;
  [1,3].forEach(i => $("#v" + i).hidden = true); $("#v2").hidden = false; window.scrollTo({ top:0 });
}

/* ---------- 2. Reja ---------- */
async function refreshPlan(full){
  state.plan = await getJSON("/api/plan", { scenario: state.scn, triggerDate: state.trigger, amount: Number(state.form.amount) || 0, months: Number(state.form.months) || 1 });
  if (full) renderPlan(); else { renderDeadline(); renderRoute(); renderComp(); }
  store.set("form", state.form);
}

function renderPlan(){
  const p = state.plan, a = state.analysis, info = p.info;
  const focus = new Set(a.normIds || []);
  const law = n => `<div class="law"><span class="art">MK ${esc(n.article)}</span><div><b>${esc(n.title)}${focus.has(n.id) ? ' <span class="tag" style="margin-left:6px">siz uchun</span>' : ""}</b><p>${esc(n.text)}</p></div></div>`;
  const source = a.source === "ai" ? "Claude tahlili" : a.source === "rules" ? "Avtomatik tahlil" : "Siz tanladingiz";
  const n0 = p.norms[0];
  $("#v2").innerHTML = `
    <button class="back" type="button" data-go="1">← Boshqa vaziyat</button>
    <div class="case-head">
      <span class="tag">${esc(info.short)} · ${esc(source)}</span>
      <h2>${esc(info.title)}</h2>
      <p>${esc(a.summary || info.lead)}</p>
      ${a.missing?.length ? `<p class="small" style="color:var(--warn)">Arizaga kerak bo‘ladi: ${a.missing.map(esc).join(", ")}</p>` : ""}
    </div>
    <div class="summary">
      <div class="card" id="deadlineCard"></div>
      ${info.compensation ? `<div class="card">
        <div class="kicker">Sizga qo‘shimcha to‘lanishi kerak</div>
        <div class="money" id="compBig">—</div>
        <div class="small muted" id="compSub"></div>
        <div class="inline">
          <div class="field"><label for="cAmount">Qarz, so‘m</label><input id="cAmount" inputmode="numeric" placeholder="9 000 000" value="${esc(state.form.amount ? fmtSum(state.form.amount) : "")}"></div>
          <div class="field" style="flex-basis:90px"><label for="cMonths">Necha oy</label><input id="cMonths" inputmode="numeric" value="${esc(state.form.months || "1")}"></div>
        </div></div>`
      : `<div class="card"><div class="kicker">Sizning asosiy huquqingiz</div>
        <div class="money" style="font-size:26px">${esc(n0.title)}</div>
        <p class="small muted" style="margin:6px 0 0">${esc(n0.text)}</p>
        <div class="src"><span class="art">MK ${esc(n0.article)}</span></div></div>`}
    </div>
    <h3 class="sec">Nima qilish kerak</h3>
    <ol class="steps" id="route"></ol>
    <h3 class="sec">Qonun nima deydi</h3>
    <div class="laws">${p.norms.slice(0, 3).map(law).join("")}</div>
    ${p.norms.length > 3 ? `<details class="more" style="margin-top:10px"><summary>Yana ${p.norms.length - 3} ta norma</summary><div class="laws">${p.norms.slice(3).map(law).join("")}</div></details>` : ""}
    <div class="src"><a href="${esc(state.meta.lex)}" target="_blank" rel="noopener">Mehnat kodeksining to‘liq matni — lex.uz ↗</a></div>
    <h3 class="sec">Dalillarni to‘plang <span class="small muted" id="evCount" style="font-family:var(--f-body);font-weight:500"></span></h3>
    <ul class="evid" id="evid">${p.evidence.map((e, i) => `<li><label><input type="checkbox" data-i="${i}"> ${esc(e)}</label></li>`).join("")}</ul>
    <div class="cta"><button class="btn primary" type="button" data-go="3">Ariza tayyorlash →</button></div>`;
  renderDeadline(); renderRoute(); renderComp(); renderEvCount();
  $("#evid").addEventListener("change", e => { const i = e.target.dataset.i; if (i != null){ state.evidence[i] = e.target.checked; renderEvCount(); } });
  const onMoney = debounce(() => {
    state.form.amount = String(Number(String($("#cAmount").value).replace(/\D/g, "")) || "");
    state.form.months = String(Math.max(1, Number($("#cMonths").value) || 1));
    refreshPlan(false).then(previewDoc);
  });
  $("#cAmount")?.addEventListener("input", onMoney);
  $("#cMonths")?.addEventListener("input", onMoney);
}

function renderDeadline(){
  const p = state.plan, cls = { low:"lv-ok", medium:"lv-warn", high:"lv-bad", expired:"lv-bad" }[p.risk.level];
  const col = { low:"var(--ok)", medium:"var(--warn)" }[p.risk.level] || "var(--stamp)";
  $("#deadlineCard").innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div class="kicker">Sudga murojaat uchun qoldi</div><span class="pill ${cls}">${esc(p.risk.label)}</span></div>
    <div class="big">${Math.abs(p.daysLeft)}<small>${p.daysLeft < 0 ? "kun kechikdi" : "kun"}</small></div>
    <div class="small muted">Oxirgi kun: <b style="color:var(--ink)">${esc(p.deadlineText)}</b> · ${p.deadlineMonths} oylik muddat</div>
    <div class="bar"><i style="width:${Math.round(p.progress * 100)}%;background:${col}"></i></div>
    <div class="small" style="margin-top:8px">${esc(p.risk.tip)}</div>
    <div class="inline"><div class="field"><label for="trigger">${esc(p.info.trigger)}</label><input type="date" id="trigger" value="${esc(p.trigger)}" max="${iso(new Date())}"></div></div>`;
  $("#trigger").addEventListener("change", e => { if (e.target.value){ state.trigger = e.target.value; refreshPlan(false).then(previewDoc); } });
}

function renderRoute(){
  $("#route").innerHTML = state.plan.steps.map((st, i) => `
    <li><span class="num">${i + 1}</span><div class="body">
      <div class="row"><div><div class="org">${esc(st.org)}</div><h3>${esc(st.t)}</h3></div>
      <span class="when ${st.hot ? "hot" : ""}">${esc(st.when)}</span></div>
      <p>${esc(st.body)}</p></div></li>`).join("");
}

function renderComp(){
  if (!$("#compBig")) return;
  const c = state.plan.compensation;
  $("#compBig").textContent = c ? `kamida ${fmtShort(c.low)} so‘m` : "Qarzni kiriting";
  $("#compSub").textContent = c
    ? `Qarz ustiga, MK 333-modda bo‘yicha (MB stavkasi ${c.rate}%). Ayrim mutaxassislar talqinida ${fmtShort(c.high)} so‘mgacha.`
    : "Kechiktirilgan har bir kun uchun kompensatsiya (MK 333-modda)";
}
function renderEvCount(){
  const have = Object.values(state.evidence).filter(Boolean).length;
  $("#evCount").textContent = `· ${have} / ${state.plan.evidence.length} bor`;
}

/* ---------- 3. Ariza ---------- */
function renderDocView(){
  const docs = state.plan.info.documents;
  $("#seg").innerHTML = docs.map(r => `<button type="button" data-r="${r}" aria-pressed="${r === state.recipient}">${esc(state.meta.recipients[r])}</button>`).join("");
  const fm = state.form;
  const input = ([k, l, ph]) => `<div class="field" data-f="${k}" ${k === "empAddress" && state.recipient !== "court" ? "hidden" : ""}><label for="f_${k}">${l}</label><input id="f_${k}" data-k="${k}" placeholder="${esc(ph)}" value="${esc(fm[k] || "")}" autocomplete="off"></div>`;
  $("#docForm").innerHTML = `
    <fieldset><legend>Siz haqingizda</legend>${FIELDS.you.map(input).join("")}</fieldset>
    <fieldset><legend>Ish joyi</legend>${FIELDS.work.map(input).join("")}</fieldset>
    <details class="more"><summary>+ Qo‘shimcha holatlar</summary>
      <div class="field"><label for="f_extra">Ariza matniga qo‘shiladi</label><textarea id="f_extra" data-k="extra">${esc(fm.extra || "")}</textarea></div></details>`;
  previewDoc();
}

const docRequest = () => ({ scenario: state.scn, recipient: state.recipient, triggerDate: state.trigger, form: state.form });

async function previewDoc(){
  if (!state.plan) return;
  try {
    const m = await getJSON("/api/document/preview", docRequest());
    state.blocks = m.blocks;
    $("#paper").innerHTML = m.blocks.map(blockHTML).join("");
  } catch (e){ $("#paper").textContent = e.message; }
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

async function download(fmt){
  const btn = fmt === "docx" ? $("#dlDocx") : $("#dlPdf"), label = btn.textContent;
  btn.disabled = true; btn.innerHTML = `<span class="spin"></span> ${label}`;
  try {
    const res = await api(`/api/document/${fmt}`, docRequest());
    const name = (res.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/)?.[1] || `HuquqYol.${fmt}`;
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href:url, download:name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(fmt.toUpperCase() + " yuklab olindi");
  } catch (e){ $("#dlNote").textContent = e.message; }
  finally { btn.disabled = false; btn.textContent = label; }
}

/* ---------- Hodisalar ---------- */
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]");
  if (g && !g.disabled){ go(Number(g.dataset.go)); return; }
  const c = e.target.closest("[data-case]");
  if (c){ choose({ scenario:c.dataset.case, confidence:1, summary:"", facts:{}, source:"choice" }).catch(err => toast(err.message)); return; }
  const r = e.target.closest("#seg button");
  if (r){
    state.recipient = r.dataset.r;
    document.querySelectorAll("#seg button").forEach(b => b.setAttribute("aria-pressed", String(b === r)));
    const ea = document.querySelector('[data-f="empAddress"]'); if (ea) ea.hidden = state.recipient !== "court";
    previewDoc();
  }
});
const onForm = debounce(previewDoc, 200);
$("#docForm").addEventListener("input", e => { const k = e.target.dataset.k; if (k){ state.form[k] = e.target.value; store.set("form", state.form); onForm(); } });
$("#home").addEventListener("click", () => go(1));
$("#analyzeBtn").addEventListener("click", analyze);
$("#problem").addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) analyze(); });
$("#dlDocx").addEventListener("click", () => download("docx"));
$("#dlPdf").addEventListener("click", () => download("pdf"));
$("#copyTxt").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(docText()); toast("Matn nusxalandi"); }
  catch { const rg = document.createRange(); rg.selectNodeContents($("#paper")); const s = getSelection(); s.removeAllRanges(); s.addRange(rg); toast("Matn belgilandi: Ctrl+C bosing"); }
});

/* ---------- Boshlash ---------- */
try {
  state.meta = await getJSON("/api/meta");
  renderCases();
} catch (e){
  $("#cases").innerHTML = `<p class="error">Server ishlamayapti: ${esc(e.message)}. <code>npm start</code> bilan ishga tushiring.</p>`;
}
