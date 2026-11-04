// HuquqYo‘l — frontend. Huquqiy mantiq serverda (/api/*); bu fayl ko‘rsatadi, saqlaydi va yo‘naltiradi.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const fmtSum = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmtShort = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(".", ",") + " mln" : fmtSum(n);
const iso = d => { const z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
const monthsAgo = n => { const d = new Date(); d.setHours(0,0,0,0); d.setMonth(d.getMonth() - n); return d; };
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const KEY = "huquqyol:v1";
const store = {
  load(){ try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } },
  save(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} },
  clear(){ try { localStorage.removeItem(KEY); } catch {} }
};
function announce(msg){ const l = $("#live"); l.textContent = ""; setTimeout(() => { l.textContent = msg; }, 30); }
function toast(msg){ const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.append(t); announce(msg); setTimeout(() => t.remove(), 2800); }

async function api(path, body){
  let res;
  try {
    res = await fetch(path, body === undefined ? {} : { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  } catch { throw new Error("Internet aloqasi yo‘q yoki server ishlamayapti."); }
  if (!res.ok){ let msg = "Server javob bermadi. Qayta urinib ko‘ring."; try { msg = (await res.json()).error || msg; } catch {} throw new Error(msg); }
  return res;
}
const getJSON = async (p, b) => (await api(p, b)).json();

const ICONS = {
  ish_haqi:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.4"/><path d="M7 3.5h10"/></svg>',
  ishdan_boshatish:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M9 16l-4-4 4-4"/><path d="M5 12h10"/></svg>',
  tatil:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="10" r="4"/><path d="M12 2v1.5M12 16.5V18M4 10H2.5M21.5 10H20M6.3 4.3l1 1M16.7 14.7l1 1M6.3 15.7l1-1M16.7 5.3l1-1"/><path d="M3 21c3-1.5 6-1.5 9 0s6 1.5 9 0"/></svg>',
  hisob_kitob:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h6M9 16h4"/></svg>'
};
const EXAMPLES = [
  "Ish beruvchim 3 oydan beri maosh bermayapti, qarzi 9 million so‘m",
  "Meni ogohlantirmasdan ishdan bo‘shatishdi, buyruqni ham bermadi",
  "Ishdan ketdim, lekin hisob-kitob va mehnat daftarchamni berishmayapti"
];
const FIELDS = {
  you:[["fio","F.I.Sh.","Karimov Aziz Botirovich","name"],["address","Yashash manzili","Toshkent sh., Chilonzor t., …","street-address"],["phone","Telefon","+998 90 123 45 67","tel"]],
  work:[["employer","Ish beruvchi","«…» MChJ","organization"],["position","Lavozimingiz","omborchi","organization-title"],["amount","Qarz summasi, so‘m","9 000 000","off"],["boss","Rahbar F.I.Sh.","direktor","off"],["district","Tuman yoki shahar","Chilonzor tumani","address-level2"],["empAddress","Ish beruvchi manzili","","off"]]
};
// Hujjatdagi bo‘sh joy → qaysi maydonga olib boradi
const PH_FIELD = { "F.I.Sh.":"fio", "manzil":"address", "telefon":"phone", "tashkilot nomi":"employer", "lavozim":"position", "rahbar F.I.Sh.":"boss", "tuman/shahar":"district", "tuman":"district", "ish beruvchi manzili":"empAddress", "summa":"amount" };
const ROUTES = { 1:"vaziyat", 2:"reja", 3:"ariza" };

const state = { meta:null, analysis:null, scn:null, plan:null, trigger:null, recipient:"employer", form:{}, evidence:[], blocks:[], missing:[] };
const persist = () => store.save({ analysis:state.analysis, scn:state.scn, trigger:state.trigger, recipient:state.recipient, form:state.form, evidence:state.evidence, at:Date.now() });
const scenarioMeta = id => state.meta.scenarios.find(s => s.id === id);

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
  const h = $(`#v${n} h1, #v${n} h2`); if (h){ h.setAttribute("tabindex", "-1"); h.focus({ preventScroll:true }); }
  document.title = ["HuquqYo‘l", ["Vaziyat","Reja","Ariza"][n - 1]].join(" — ");
}
window.addEventListener("popstate", () => {
  const n = Number(Object.keys(ROUTES).find(k => "#" + ROUTES[k] === location.hash)) || 1;
  go(n, { push:false });
});

/* ---------- 1. Vaziyat ---------- */
function renderStart(){
  $("#cases").innerHTML = state.meta.scenarios.map(s => `
    <button class="case" type="button" data-case="${s.id}"><span class="ic">${ICONS[s.id] || ""}</span><span><b>${esc(s.title)}</b><span>${esc(s.card)}</span></span></button>`).join("");
  $("#examples").innerHTML = EXAMPLES.map((e, i) => `<button class="chipbtn" type="button" data-ex="${i}">${esc(e)}</button>`).join("");
  $("#aiDot").classList.toggle("on", state.meta.ai);
  $("#aiText").textContent = state.meta.ai ? "AI tahlil: Claude" : "Qidiruv tahlili";
}

function renderResume(saved){
  const s = saved?.scn && scenarioMeta(saved.scn);
  if (!s) return;
  const el = $("#resume");
  el.innerHTML = `<span>Oldingi ishingiz: <b>${esc(s.title)}</b></span>
    <span class="acts"><button class="btn primary sm" type="button" id="resumeGo">Davom etish</button><button class="btn ghost sm" type="button" id="resumeNew">Yangidan boshlash</button></span>`;
  el.hidden = false;
  $("#resumeGo").onclick = async () => { el.hidden = true; Object.assign(state, saved); await refreshPlan(true); renderDocView(); go(2); };
  $("#resumeNew").onclick = () => { el.hidden = true; store.clear(); state.form = {}; };
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

async function choose(a){
  state.analysis = a;
  $("#resume").hidden = true;
  if (a.scenario === "boshqa"){ renderOut(); return; }
  const f = a.facts || {};
  state.scn = a.scenario;
  state.trigger = f.eventDate || iso(f.months && a.scenario === "ish_haqi" ? monthsAgo(f.months) : monthsAgo(1));
  for (const k of ["employer","position"]) if (f[k]) state.form[k] = f[k];
  if (f.amount) state.form.amount = String(f.amount);
  if (f.months) state.form.months = String(f.months);
  state.evidence = [];
  const docs = scenarioMeta(a.scenario).documents;
  if (!docs.includes(state.recipient)) state.recipient = docs[0];
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
    <div class="case-head"><span class="tag">Doiradan tashqarida</span><h2>Bu holatni hozircha qamramaymiz</h2>
    <p>HuquqYo‘l hozir mehnat nizolarida yordam beradi: ish haqi, ishdan bo‘shatish, ta’til va hisob-kitob. ${a.summary ? esc(a.summary) : "Vaziyatni ish beruvchi yoki maosh bilan bog‘lab batafsilroq yozing yoki advokatga murojaat qiling."}</p></div>`;
  [1,3].forEach(i => $("#v" + i).hidden = true); $("#v2").hidden = false;
  history.pushState(null, "", "#reja"); window.scrollTo({ top:0 }); $("#v2 h2").setAttribute("tabindex","-1"); $("#v2 h2").focus();
}

/* ---------- 2. Reja ---------- */
async function refreshPlan(full){
  state.plan = await getJSON("/api/plan", { scenario: state.scn, triggerDate: state.trigger, amount: Number(state.form.amount) || 0, months: Number(state.form.months) || 1 });
  if (full) renderPlan(); else { renderDeadline(); renderRoute(); renderComp(); }
  persist();
}

function renderPlan(){
  const p = state.plan, a = state.analysis || {}, info = p.info;
  const focus = new Set(a.normIds || []);
  const law = n => `<div class="law"><span class="art">MK ${esc(n.article)}</span><div><b>${esc(n.title)}${focus.has(n.id) ? ' <span class="tag">siz uchun</span>' : ""}</b><p>${esc(n.text)}</p></div></div>`;
  const source = a.source === "ai" ? "Claude tahlili" : a.source === "rules" ? "Avtomatik tahlil" : "Siz tanladingiz";
  const n0 = p.norms[0];
  $("#v2").innerHTML = `
    <button class="back" type="button" data-go="1">← Boshqa vaziyat</button>
    <div class="case-head">
      <span class="tag">${esc(info.short)} · ${esc(source)}</span>
      <h2>${esc(info.title)}</h2>
      <p>${esc(a.summary || info.lead)}</p>
      ${a.missing?.length ? `<p class="small warnline">Arizaga kerak bo‘ladi: ${a.missing.map(esc).join(", ")}</p>` : ""}
    </div>
    <div class="summary">
      <div class="card" id="deadlineCard"></div>
      ${info.compensation ? `<div class="card">
        <div class="kicker">Sizga qo‘shimcha to‘lanishi kerak</div>
        <div class="money" id="compBig">—</div>
        <div class="small muted" id="compSub"></div>
        <div class="inline">
          <div class="field"><label for="cAmount">Qarz, so‘m</label><input id="cAmount" inputmode="numeric" autocomplete="off" placeholder="9 000 000" value="${esc(state.form.amount ? fmtSum(state.form.amount) : "")}"></div>
          <div class="field months"><label for="cMonths">Necha oy</label><input id="cMonths" inputmode="numeric" autocomplete="off" value="${esc(state.form.months || "1")}"></div>
        </div></div>`
      : `<div class="card"><div class="kicker">Sizning asosiy huquqingiz</div>
        <div class="money right">${esc(n0.title)}</div>
        <p class="small muted">${esc(n0.text)}</p>
        <div class="src"><span class="art">MK ${esc(n0.article)}</span></div></div>`}
    </div>
    <h3 class="sec">Nima qilish kerak</h3>
    <ol class="steps" id="route"></ol>
    <h3 class="sec">Qonun nima deydi</h3>
    <div class="laws">${p.norms.slice(0, 3).map(law).join("")}</div>
    ${p.norms.length > 3 ? `<details class="more"><summary>Yana ${p.norms.length - 3} ta norma</summary><div class="laws">${p.norms.slice(3).map(law).join("")}</div></details>` : ""}
    <div class="src"><a href="${esc(state.meta.lex)}" target="_blank" rel="noopener noreferrer">Mehnat kodeksining to‘liq matni — lex.uz ↗</a></div>
    <h3 class="sec">Dalillarni to‘plang <span class="small muted evcount" id="evCount"></span></h3>
    <p class="small muted evhint">Belgilaganlaringiz arizaning «Ilovalar» ro‘yxatiga qo‘shiladi.</p>
    <ul class="evid" id="evid">${p.evidence.map((e, i) => `<li><label><input type="checkbox" data-i="${i}" ${state.evidence.includes(i) ? "checked" : ""}> ${esc(e)}</label></li>`).join("")}</ul>
    <div class="cta"><button class="btn primary" type="button" data-go="3">Ariza tayyorlash →</button></div>`;
  renderDeadline(); renderRoute(); renderComp(); renderEvCount();
  $("#evid").addEventListener("change", e => {
    const i = Number(e.target.dataset.i); if (Number.isNaN(i)) return;
    state.evidence = e.target.checked ? [...new Set([...state.evidence, i])] : state.evidence.filter(x => x !== i);
    renderEvCount(); persist(); previewDoc();
  });
  const onMoney = debounce(() => {
    state.form.amount = String(Number(String($("#cAmount").value).replace(/\D/g, "")) || "");
    state.form.months = String(Math.min(60, Math.max(1, Number($("#cMonths").value) || 1)));
    const af = $("#f_amount"); if (af) af.value = state.form.amount ? fmtSum(state.form.amount) : "";
    refreshPlan(false).then(previewDoc).catch(e => toast(e.message));
  }, 300);
  $("#cAmount")?.addEventListener("input", onMoney);
  $("#cMonths")?.addEventListener("input", onMoney);
}

function renderDeadline(){
  const p = state.plan, cls = { low:"lv-ok", medium:"lv-warn", high:"lv-bad", expired:"lv-bad" }[p.risk.level];
  $("#deadlineCard").innerHTML = `
    <div class="cardhead"><div class="kicker">Sudga murojaat uchun qoldi</div><span class="pill ${cls}">${esc(p.risk.label)}</span></div>
    <div class="big">${Math.abs(p.daysLeft)}<small>${p.daysLeft < 0 ? "kun kechikdi" : "kun"}</small></div>
    <div class="small muted">Oxirgi kun: <b class="ink">${esc(p.deadlineText)}</b> · ${p.deadlineMonths} oylik muddat</div>
    <div class="bar ${cls}" role="progressbar" aria-label="O‘tgan muddat" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p.progress * 100)}"><i style="width:${Math.round(p.progress * 100)}%"></i></div>
    <div class="small tip">${esc(p.risk.tip)}</div>
    <div class="inline"><div class="field"><label for="trigger">${esc(p.info.trigger)}</label><input type="date" id="trigger" value="${esc(p.trigger)}" max="${iso(new Date())}"></div></div>`;
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

function renderComp(){
  if (!$("#compBig")) return;
  const c = state.plan.compensation;
  $("#compBig").textContent = c ? `kamida ${fmtShort(c.low)} so‘m` : "Qarzni kiriting";
  $("#compSub").textContent = c
    ? `Qarz ustiga, MK 333-modda bo‘yicha (MB stavkasi ${c.rate}%). Ayrim mutaxassislar talqinida ${fmtShort(c.high)} so‘mgacha.`
    : "Kechiktirilgan har bir kun uchun kompensatsiya (MK 333-modda)";
}
function renderEvCount(){ $("#evCount").textContent = `· ${state.evidence.length} / ${state.plan.evidence.length} bor`; }

/* ---------- 3. Ariza ---------- */
function renderDocView(){
  const docs = state.plan.info.documents, comp = state.plan.info.compensation;
  $("#seg").innerHTML = docs.map(r => `<button type="button" data-r="${r}" aria-pressed="${r === state.recipient}">${esc(state.meta.recipients[r])}</button>`).join("");
  const fm = state.form;
  const input = ([k, l, ph, ac]) => {
    const hidden = (k === "empAddress" && state.recipient !== "court") || (k === "amount" && !comp);
    const val = k === "amount" && fm[k] ? fmtSum(fm[k]) : fm[k] || "";
    return `<div class="field" data-f="${k}" ${hidden ? "hidden" : ""}><label for="f_${k}">${l}</label>
      <input id="f_${k}" data-k="${k}" placeholder="${esc(ph)}" value="${esc(val)}" autocomplete="${ac}" ${k === "phone" ? 'type="tel" inputmode="tel"' : ""} ${k === "amount" ? 'inputmode="numeric"' : ""} maxlength="${k === "address" || k === "empAddress" ? 200 : 120}">
      <span class="err" id="e_${k}" hidden></span></div>`;
  };
  $("#docForm").innerHTML = `
    <fieldset><legend>Siz haqingizda</legend>${FIELDS.you.map(input).join("")}</fieldset>
    <fieldset><legend>Ish joyi</legend>${FIELDS.work.map(input).join("")}</fieldset>
    <details class="more" ${fm.extra ? "open" : ""}><summary>+ Qo‘shimcha holatlar</summary>
      <div class="field"><label for="f_extra">Ariza matniga qo‘shiladi</label><textarea id="f_extra" data-k="extra" maxlength="1500">${esc(fm.extra || "")}</textarea></div></details>`;
  previewDoc();
}

// Noto‘g‘ri kiritilgan maydon serverga yuborilmaydi (xato faqat maydon ostida ko‘rsatiladi)
const docRequest = () => {
  const form = { ...state.form };
  for (const k of ["phone","amount"]) if (form[k] && validateField(k, k === "amount" ? fmtSum(form[k]) : form[k])) delete form[k];
  return { scenario: state.scn, recipient: state.recipient, triggerDate: state.trigger, form, evidence: state.evidence };
};

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
  el.textContent = n === 0 ? "✓ Barcha joylar to‘ldirilgan" : `${n} ta joy to‘ldirilmagan: ${state.missing.join(", ")} — to‘ldirish`;
  document.querySelectorAll(".field.need").forEach(f => f.classList.remove("need"));
  state.missing.forEach(ph => { const k = PH_FIELD[ph]; const f = k && document.querySelector(`[data-f="${k}"]`); if (f) f.classList.add("need"); });
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

function validateField(k, v){
  if (k === "phone" && v && !/^[+\d\s()-]{7,40}$/.test(v)) return "Faqat raqam, +, bo‘sh joy va qavs. Masalan: +998 90 123 45 67";
  if (k === "amount" && v && !/^[\d\s]+$/.test(v)) return "Faqat raqam kiriting.";
  return "";
}
function formValid(){
  let ok = true;
  for (const k of ["phone","amount"]){
    const el = $("#f_" + k); if (!el) continue;
    const msg = validateField(k, el.value.trim()), e = $("#e_" + k);
    e.textContent = msg; e.hidden = !msg; el.setAttribute("aria-invalid", String(!!msg));
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
  if (c){ choose({ scenario:c.dataset.case, confidence:1, summary:"", facts:{}, source:"choice" }).catch(err => toast(err.message)); return; }
  const ex = e.target.closest("[data-ex]");
  if (ex){ $("#problem").value = EXAMPLES[ex.dataset.ex]; $("#problem").focus(); return; }
  const r = e.target.closest("#seg button");
  if (r){
    state.recipient = r.dataset.r; persist();
    document.querySelectorAll("#seg button").forEach(b => b.setAttribute("aria-pressed", String(b === r)));
    const ea = document.querySelector('[data-f="empAddress"]'); if (ea) ea.hidden = state.recipient !== "court";
    previewDoc();
  }
});
const onForm = debounce(previewDoc, 220);
$("#docForm").addEventListener("input", e => {
  const k = e.target.dataset.k; if (!k) return;
  let v = e.target.value;
  if (k === "amount"){ const n = v.replace(/\D/g, "").slice(0, 13); v = n; e.target.value = n ? fmtSum(n) : ""; const ca = $("#cAmount"); if (ca) ca.value = e.target.value; }
  state.form[k] = v; persist(); onForm();
  if (k === "amount") refreshPlan(false).catch(() => {});
});
$("#docForm").addEventListener("focusout", e => { const k = e.target.dataset?.k; if (k === "phone" || k === "amount") formValid(); });
$("#missing").addEventListener("click", () => {
  const k = state.missing.map(ph => PH_FIELD[ph]).find(Boolean);
  const el = k && $("#f_" + k);
  if (el){ el.scrollIntoView({ block:"center" }); el.focus(); }
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
$("#wipe").addEventListener("click", () => { store.clear(); state.form = {}; toast("Ma’lumotlaringiz o‘chirildi"); setTimeout(() => { location.href = location.pathname; }, 600); });

/* ---------- Boshlash ---------- */
try {
  state.meta = await getJSON("/api/meta");
  renderStart();
  const saved = store.load();
  if (saved?.form) state.form = saved.form;
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
