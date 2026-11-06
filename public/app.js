// HuquqYo‘l — frontend. Huquqiy mantiq serverda (/api/*); bu fayl ko‘rsatadi, saqlaydi va yo‘naltiradi.
import { esc, ICONS, examples, domainCardsHTML, examplesHTML } from "/shared.js";
import { makeT, normLang } from "/i18n.js";
import { toCyrillic as toCyr } from "/translit.js";
const $ = s => document.querySelector(s);
const fmtSum = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const iso = d => { const z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
const monthsAgo = n => { const d = new Date(); d.setHours(0,0,0,0); d.setMonth(d.getMonth() - n); return d; };
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const KEY = "huquqyol:v2";
const store = {
  load(){ try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } },
  save(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} },
  clear(){ try { localStorage.removeItem(KEY); } catch {} }
};
function announce(msg){ const l = $("#live"); l.textContent = ""; setTimeout(() => { l.textContent = msg; }, 30); }
function toast(msg){ document.querySelectorAll(".toast").forEach(x => x.remove()); const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; ($("#main") || document.body).append(t); announce(msg); setTimeout(() => t.remove(), Math.max(2800, msg.length * 70)); }

// Qaytarib bo‘lmaydigan amaldan oldin tasdiq: xavfsiz javob (bekor qilish) oldindan tanlangan, Esc ham bekor qiladi
function confirmAction({ title, text, ok }){
  const d = $("#dlg");
  $("#dlgT").textContent = title; $("#dlgP").textContent = text; $("#dlgOk").textContent = ok;
  d.returnValue = "";
  d.showModal();
  return new Promise(res => d.addEventListener("close", () => res(d.returnValue === "ok"), { once:true }));
}

async function api(path, body){
  let res;
  try {
    res = await fetch(path, body === undefined ? {} : { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ...body, lang: LANG }) });
  } catch { throw new Error(t("errNet")); }
  if (!res.ok){ let msg = t("errServer"); try { msg = (await res.json()).error || msg; } catch {} throw new Error(msg); }
  return res;
}
const getJSON = async (p, b) => (await api(p, b)).json();


const ROUTES = { 1:"vaziyat", 2:"reja", 3:"ariza" };

/* ---------- Til: o‘zbek (lotin), o‘zbek (kirill), rus ----------
   Sahifa serverda tanlangan tilda chiziladi (cookie hy_lang). Til almashtirilganda holat saqlanadi va sahifa
   shu bosqichda qayta ochiladi: barcha matnlar, normalar va ariza yangi tilda keladi. */
const LANG = normLang(document.documentElement.dataset.lang);
const t = makeT(LANG);
const LANG_KEY = "huquqyol:lang";
const setCookie = l => { document.cookie = `hy_lang=${l}; path=/; max-age=31536000; samesite=lax`; };
function setLang(l){
  l = normLang(l);
  try { localStorage.setItem(LANG_KEY, l); } catch {}
  setCookie(l);
  if (l === LANG) return;
  persist();
  location.reload();
}
// Avvalgi versiyada tanlangan yozuv (localStorage) cookie bo‘lmasa ham hisobga olinadi
(() => {
  if (/(?:^|;\s*)hy_lang=/.test(document.cookie)) return;
  let saved = null; try { saved = localStorage.getItem(LANG_KEY); } catch {}
  if (saved === "cyr" || saved === "ru"){ setCookie(saved); if (saved !== LANG) location.reload(); }
})();

// Ariza beruvchi ma’lumotlari (F.I.Sh., manzil, telefon) umumiy; qolgan maydonlar har bir holat uchun alohida saqlanadi,
// shunda bir holatdagi «summa» boshqasiga o‘tib ketmaydi.
const state = { meta:null, analysis:null, scn:null, plan:null, trigger:null, recipient:null, applicant:{}, formByScn:{}, evidence:[], blocks:[], missing:[], domain:null };
const persist = () => state.meta && store.save({ analysis:state.analysis, scn:state.scn, trigger:state.trigger, recipient:state.recipient, applicant:state.applicant, formByScn:state.formByScn, evidence:state.evidence, at:Date.now() });
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
  $("#stepsNav").hidden = n === 1;                         // bosh sahifada qadamlar pastdagi «Qanday ishlaydi» qatorida
  document.querySelectorAll(".stepper button").forEach(b => {
    const i = Number(b.dataset.go);
    b.disabled = i > 1 && !state.plan;
    if (i === n) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    b.classList.toggle("done", i < n);
  });
  if (push && location.hash !== "#" + ROUTES[n]) history.pushState(null, "", "#" + ROUTES[n]);
  window.scrollTo({ top:0 });
  const h = $(`#v${n} h1`); if (h){ h.setAttribute("tabindex", "-1"); h.focus({ preventScroll:true }); }
  document.title = "HuquqYo‘l — " + t("step" + n);
}
window.addEventListener("popstate", () => {
  const n = Number(Object.keys(ROUTES).find(k => "#" + ROUTES[k] === location.hash)) || 1;
  go(n, { push:false });
});

/* ---------- 1. Vaziyat ---------- */
function renderStart(){
  renderDomains();
  $("#examples").innerHTML = examplesHTML(LANG);
  $("#aiDot").classList.toggle("on", state.meta.ai);
  $("#aiText").textContent = t(state.meta.ai ? "aiOn" : "aiOff");
}
function renderDomains(){
  state.domain = null;
  $("#pickHead").hidden = true;
  $("#pickTitle").hidden = false;
  $("#cases").className = "domains";
  $("#cases").innerHTML = domainCardsHTML(state.meta, t);
}
function renderDomain(id){
  const d = state.meta.domains.find(x => x.id === id); if (!d) return renderDomains();
  // Sohada bitta holat bo‘lsa, ortiqcha bosish so‘ralmaydi
  const list = state.meta.scenarios.filter(s => s.domain === id);
  if (list.length === 1) return pickCase(list[0].id);
  state.domain = id;
  $("#pickTitle").hidden = true;
  $("#pickHead").hidden = false;
  $("#pickHead").innerHTML = `<button class="back" type="button" id="allDomains">${t("allDomains")}</button><h2>${esc(d.title)}</h2>`;
  $("#cases").className = "domains list";
  $("#cases").innerHTML = list.map(s => `
    <button class="case" type="button" data-case="${s.id}"><span class="ic">${ICONS[s.domain] || ""}</span><span><b>${esc(s.title)}</b><span>${esc(s.card)}</span></span></button>`).join("");
  $("#cases .case")?.focus();
}

function renderResume(saved){
  const s = saved?.scn && scenarioMeta(saved.scn);
  if (!s) return;
  const el = $("#resume");
  el.innerHTML = `<span>${t("resumeText")} <b>${esc(s.title)}</b></span>
    <span class="acts"><button class="btn primary sm" type="button" id="resumeGo">${t("resumeGo")}</button><button class="btn ghost sm" type="button" id="resumeNew">${t("resumeNew")}</button></span>`;
  el.hidden = false;
  $("#resumeGo").onclick = async () => { el.hidden = true; Object.assign(state, saved); await refreshPlan(true); renderDocView(); go(2); };
  $("#resumeNew").onclick = async () => {
    if (!await confirmAction({ title:t("newT"), text:t("newP"), ok:t("del") })) return;
    el.hidden = true; store.clear(); state.formByScn = {}; $("#problem").focus();
  };
}

function setAskErr(msg){
  const err = $("#askErr");
  err.textContent = msg; err.hidden = !msg;
  $("#problem").setAttribute("aria-invalid", String(!!msg));
}
async function analyze(){
  const text = $("#problem").value.trim(), btn = $("#analyzeBtn"), err = $("#askErr");
  setAskErr("");
  if (text.length < 8){ setAskErr(t("tooShort")); $("#problem").focus(); err.scrollIntoView({ block:"nearest" }); return; }
  btn.disabled = true; btn.innerHTML = `<span class="spin" aria-hidden="true"></span> ${t("analyzing")}`;
  announce(t("analyzing"));
  try { await choose(await getJSON("/api/analyze", { text })); }
  catch (e){ setAskErr(e.message); err.scrollIntoView({ block:"nearest" }); }
  finally { btn.disabled = false; btn.textContent = t("analyze"); }
}

function defaultTrigger(m, facts){
  if (facts.eventDate) return facts.eventDate;
  if (m.id === "ish_haqi" && Number(facts.form?.months) > 0) return iso(monthsAgo(Number(facts.form.months)));
  const short = m.deadline?.days || m.deadline?.none;          // qisqa muddatli holatlarda bugungi sana
  return iso(short ? new Date() : monthsAgo(1));
}
const pickCase = id => document.body.classList.contains("busy") ? null : choose({ scenario:id, confidence:1, summary:"", facts:{ form:{} }, source:"choice" }).catch(err => toast(err.message));
async function choose(a){
  document.body.classList.add("busy");
  try { await openCase(a); } finally { document.body.classList.remove("busy"); }
}
async function openCase(a){
  state.analysis = { ...a, lang: LANG };
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
  $("#v2").innerHTML = `<button class="back" type="button" data-go="1">${t("back")}</button>
    <div class="case-head"><span class="tag">${t("outTag")}</span><h1>${t("outTitle")}</h1>
    <p>${esc(t("outText", { n: state.meta.domains.length, list: state.meta.domains.map(d => d.title.toLowerCase()).join(", "), summary: a.summary ? a.summary + " " : "" }))}</p></div>
    <button class="btn primary" type="button" data-go="1" data-to="pickTitle">${t("outGo")}</button>`;
  [1,3].forEach(i => $("#v" + i).hidden = true); $("#v2").hidden = false;
  history.pushState(null, "", "#reja"); window.scrollTo({ top:0 }); $("#v2 h1").setAttribute("tabindex","-1"); $("#v2 h1").focus();
}

/* ---------- 2. Reja ---------- */
async function refreshPlan(full){
  state.plan = await getJSON("/api/plan", { scenario: state.scn, triggerDate: state.trigger, form: cleanForm() });
  if (full) renderPlan(); else { renderDeadline(); renderRoute(); renderCalc(); }
  persist();
}

const badge = n => n.article ? `<span class="art">${esc(n.article)}</span>` : `<span class="art law-only">${t("lawOnly")}</span>`;
function calcInput(f){
  const v = form()[f.k] || "";
  const attrs = f.type === "date" ? `type="date" max="${iso(new Date())}"` : `inputmode="numeric" autocomplete="off"`;
  const val = f.type === "money" && v ? fmtSum(v) : v;
  return `<div class="field"><label for="c_${f.k}">${esc(f.label)}</label><input id="c_${f.k}" data-ck="${f.k}" data-type="${f.type}" ${attrs} value="${esc(val)}"></div>`;
}
function renderPlan(){
  const p = state.plan, info = p.info, m = scenarioMeta(state.scn);
  // AI xulosasi boshqa tilda yozilgan bo‘lsa (til almashtirilgan), uning o‘rniga holat tavsifi ko‘rsatiladi
  const a0 = state.analysis || {}, a = a0.lang && a0.lang !== LANG ? { ...a0, summary:"", missing:[] } : a0;
  const focus = new Set(a.normIds || []);
  const law = n => `<div class="law">${badge(n)}<div><b>${esc(n.title)}${focus.has(n.id) ? ` <span class="tag">${t("forYou")}</span>` : ""}</b><p>${esc(n.text)}</p><span class="lawsrc">${esc(n.lawName)}</span></div></div>`;
  const source = t(a.source === "ai" ? "srcAI" : a.source === "rules" ? "srcRules" : "srcChoice");
  const n0 = p.norms[0];
  const laws = [...new Map(p.norms.map(n => [n.law, { name:n.lawName, url:n.lawUrl }])).values()];
  const calcFields = m.fields.filter(f => f.calc);
  $("#v2").innerHTML = `
    <button class="back" type="button" data-go="1">${t("otherSituation")}</button>
    <div class="case-head">
      <div class="headmeta"><span class="tag">${esc(state.meta.domains.find(d => d.id === info.domain)?.title || "")} · ${esc(info.short)}</span><span class="small muted">${esc(source)}</span></div>
      <h1>${esc(info.title)}</h1>
      <p>${esc(a.summary || info.lead)}</p>
      ${a.missing?.length ? `<p class="small warnline">${t("needForDoc")} ${a.missing.map(esc).join(", ")}</p>` : ""}
      ${altsHTML(a)}
    </div>
    <div class="summary">
      <div class="card" id="deadlineCard"></div>
      ${p.calc ? `<div class="card" id="calcCard">
        <div class="kicker" id="calcTitle"></div>
        <div class="money" id="calcValue">—</div>
        <div class="small muted" id="calcNote"></div>
        <div class="calcrows" id="calcRows" hidden></div>
        <div class="inline">${calcFields.map(calcInput).join("")}</div></div>`
      : `<div class="card"><div class="kicker">${t("mainRight")}</div>
        <div class="money right">${esc(n0.title)}</div>
        <p class="small muted">${esc(n0.text)}</p>
        <div class="src">${badge(n0)} <span class="lawsrc">${esc(n0.lawName)}</span></div></div>`}
    </div>
    <h2 class="sec">${t("whatToDo")}</h2>
    <ol class="steps" id="route"></ol>
    <h2 class="sec">${t("evidenceH")} <span class="small muted evcount" id="evCount"></span></h2>
    <p class="small muted evhint">${t("evidenceHint")}</p>
    <ul class="evid" id="evid">${p.evidence.map((e, i) => `<li><label><input type="checkbox" data-i="${i}" ${state.evidence.includes(i) ? "checked" : ""}> ${esc(e)}</label></li>`).join("")}</ul>
    <h2 class="sec">${t("lawSays")}</h2>
    <div class="laws">${p.norms.slice(0, 3).map(law).join("")}</div>
    ${p.norms.length > 3 ? `<details class="more"><summary>${t("moreNorms", { n: p.norms.length - 3 })}</summary><div class="laws">${p.norms.slice(3).map(law).join("")}</div></details>` : ""}
    <div class="sources">${laws.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.name)} — lex.uz ↗</a>`).join("")}</div>
    <div class="planextra"><button class="linkbtn" type="button" id="printPlan">${t("printPlan")}</button></div>
    <div class="cta"><span class="small muted ctahint">${t("nextHint")}</span><button class="btn primary" type="button" data-go="3">${t("makeDoc")}</button></div>`;
  $("#printPlan").addEventListener("click", printPlan);
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

// Tahlil ishonchi past bo‘lsa yoki boshqa holat ham yaqin chiqsa — bir bosishda almashtirish
function altsHTML(a){
  if (!a.source || a.source === "choice") return "";
  const ranked = a.retrieval?.scenarios || [], top = ranked.find(r => r.id === state.scn)?.score || 0;
  const alts = ranked.filter(r => r.id !== state.scn && r.score > 0 && r.score >= top * (a.confidence < 0.5 ? 0.4 : 0.5)).slice(0, 2).map(r => scenarioMeta(r.id)).filter(Boolean);
  if (!alts.length) return "";
  return `<div class="alts"><span class="small muted">${t("altTitle")}</span>${alts.map(m => `<button class="chipbtn" type="button" data-alt="${m.id}">${esc(m.title)}</button>`).join("")}</div>`;
}

function renderDeadline(){
  const p = state.plan, cls = { low:"lv-ok", medium:"lv-warn", high:"lv-bad", expired:"lv-bad", info:"lv-ok" }[p.risk.level];
  const head = `<div class="cardhead"><div class="kicker">${esc(p.deadlineLabel)}</div><span class="pill ${cls}">${esc(p.risk.label)}</span></div>`;
  const date = `<div class="inline"><div class="field"><label for="trigger">${esc(p.info.trigger)}</label><input type="date" id="trigger" value="${esc(p.trigger)}" max="${iso(new Date())}"><span class="hint">${t("dateHint")}</span></div></div>`;
  $("#deadlineCard").innerHTML = p.deadline == null ? `${head}
    <div class="big word">${t("unlimited")}</div>
    <div class="small tip">${esc(p.deadlineNote)}</div>${date}` : `${head}
    <div class="big">${Math.abs(p.daysLeft)}<small>${t(p.daysLeft < 0 ? "daysLate" : "days", { n: Math.abs(p.daysLeft) })}</small></div>
    <div class="small muted">${t("lastDay")} <b class="ink">${esc(p.deadlineText)}</b> · ${esc(t("termSuffix", { term: p.deadlineTerm }))}</div>
    <div class="bar ${cls}" role="progressbar" aria-label="${t("progressLabel")}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p.progress * 100)}"><i style="width:${Math.round(p.progress * 100)}%"></i></div>
    <div class="small tip">${esc(p.risk.tip)}</div>
    ${p.deadlineNote ? `<div class="small muted dnote">${esc(p.deadlineNote)}</div>` : ""}${date}
    ${p.daysLeft >= 0 ? `<button class="btn ghost sm calbtn" id="calBtn" type="button">${t("calendar")}</button>` : ""}`;
  $("#calBtn")?.addEventListener("click", downloadIcs);
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
function renderEvCount(){ $("#evCount").textContent = t("evCount", { a: state.evidence.length, b: state.plan.evidence.length }); }

/* ---------- Kalendar eslatmasi (.ics) va rejani chop etish ---------- */
const icsEsc = s => String(s).replace(/[\\;,]/g, m => "\\" + m).replace(/\r?\n/g, "\\n");
const icsDate = s => s.replace(/-/g, "");
// RFC 5545: qatorlar 75 baytdan oshmasligi kerak — uzun qator bo‘linadi
const fold = line => { const out = []; let cur = "", n = 0; for (const ch of line){ const b = new TextEncoder().encode(ch).length; if (n + b > 73){ out.push(cur); cur = " "; n = 1; } cur += ch; n += b; } out.push(cur); return out.join("\r\n"); };
function downloadIcs(){
  const p = state.plan; if (!p?.deadline) return;
  const next = d => { const x = new Date(d + "T00:00:00"); x.setDate(x.getDate() + 1); return iso(x); };
  const desc = [p.info.lead, "", ...p.steps.map((s, i) => `${i + 1}. ${s.org}: ${s.t} (${s.when})`), "", location.origin].join("\n");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const ev = (uid, day, title, alarm) => ["BEGIN:VEVENT", `UID:${uid}-${p.scenario}-${day}@huquqyol`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(day)}`, `DTEND;VALUE=DATE:${icsDate(next(day))}`, `SUMMARY:${icsEsc(title)}`, `DESCRIPTION:${icsEsc(desc)}`,
    ...(alarm ? ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(title)}`, "TRIGGER:-PT15H", "END:VALARM"] : []), "END:VEVENT"];
  const soon = (() => { const x = new Date(p.deadline + "T00:00:00"); x.setDate(x.getDate() - 3); return iso(x); })();
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HuquqYo‘l//UZ", "CALSCALE:GREGORIAN",
    ...(soon >= iso(new Date()) ? ev("soon", soon, t("calSoon", { title: p.info.title }), true) : []),
    ...ev("last", p.deadline, t("calTitle", { title: p.info.title }), true), "END:VCALENDAR"];
  const blob = new Blob([lines.map(fold).join("\r\n") + "\r\n"], { type:"text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href:url, download:`HuquqYol-${p.scenario}-${p.deadline}.ics` });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(t("calDone"));
}
function printPlan(){
  $("#v2").dataset.printed = t("printedAt", { date: new Date().toLocaleDateString(LANG === "ru" ? "ru-RU" : "uz-UZ") });
  document.querySelectorAll("#v2 details").forEach(d => d.setAttribute("open", ""));
  document.body.classList.add("print-plan");
  window.print();
}
window.addEventListener("afterprint", () => document.body.classList.remove("print-plan"));

/* ---------- 3. Ariza ---------- */
function fieldHTML(f){
  const v = form()[f.k] || "", hidden = f.docs && !f.docs.includes(state.recipient);
  // Namuna to‘ldirilgan qiymatga o‘xshamasligi uchun «Masalan:» bilan; sana maydoni placeholder ko‘rsatmaydi, unga oddiy izoh
  const ph = f.hint && f.type !== "date" ? esc(`${t("eg")} ${f.hint}`) : "";
  const note = f.hint && f.type === "date" ? `<span class="hint" id="h_${f.k}">${esc(f.hint)}</span>` : "";
  const desc = `aria-describedby="${note ? `h_${f.k} ` : ""}e_${f.k}"`;
  let input;
  if (f.type === "textarea") input = `<textarea id="f_${f.k}" data-k="${f.k}" ${desc} placeholder="${ph}" maxlength="1500">${esc(v)}</textarea>`;
  else if (f.type === "select") input = `<select id="f_${f.k}" data-k="${f.k}" ${desc}><option value="">${t("choose")}</option>${f.options.map(o => `<option value="${esc(o.v)}" ${o.v === v ? "selected" : ""}>${esc(o.text)}</option>`).join("")}</select>`;
  else {
    const t = { phone:'type="tel" inputmode="tel" autocomplete="tel"', money:'inputmode="numeric" autocomplete="off"', int:'inputmode="numeric" autocomplete="off"', date:`type="date" max="${iso(new Date())}"` }[f.type]
      || ({ fio:'autocomplete="name"', address:'autocomplete="street-address"' }[f.k] || 'autocomplete="off"');
    input = `<input id="f_${f.k}" data-k="${f.k}" data-type="${f.type}" ${desc} placeholder="${ph}" value="${esc(f.type === "money" && v ? fmtSum(v) : v)}" ${t} maxlength="200">`;
  }
  return `<div class="field" data-f="${f.k}" ${hidden ? "hidden" : ""}><label for="f_${f.k}">${esc(f.label)}</label>${input}${note}<span class="err" id="e_${f.k}" role="alert" hidden></span></div>`;
}
function renderDocView(){
  const m = scenarioMeta(state.scn);
  $("#seg").innerHTML = m.docs.map(d => `<button type="button" data-r="${d.id}" aria-pressed="${d.id === state.recipient}">${esc(d.label)}</button>`).join("");
  const groups = new Map();
  for (const f of m.fields) if (!(f.docs && f.docs.length === 0)) { const g = f.group || t("groupDefault"); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(f); }
  const extra = form().extra || "";
  $("#docForm").innerHTML = `
    <fieldset><legend>${t("aboutYou")}</legend>${state.meta.applicant.map(fieldHTML).join("")}</fieldset>
    ${[...groups].map(([g, fs]) => `<fieldset><legend>${esc(g)}</legend>${fs.map(fieldHTML).join("")}</fieldset>`).join("")}
    <details class="more" ${extra ? "open" : ""}><summary>${t("extraSummary")}</summary>
      <div class="field"><label for="f_extra">${t("extraLabel")}</label><textarea id="f_extra" data-k="extra" maxlength="1500">${esc(extra)}</textarea></div></details>`;
  renderHowto();
  previewDoc();
}
function renderHowto(){
  const d = scenarioMeta(state.scn).docs.find(x => x.id === state.recipient), h = d?.howto;
  $("#howto").hidden = !h;
  if (!h) return;
  $("#howtoH").textContent = t("howtoFor", { label: LANG === "ru" ? d.label : d.label.toLowerCase() });
  $("#howtoSteps").innerHTML = h.steps.map(x => `<li>${esc(x)}</li>`).join("");
  $("#howtoLinks").innerHTML = h.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a>`).join("");
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
const docRequest = () => ({ scenario: state.scn, recipient: state.recipient, triggerDate: state.trigger, form: cleanForm(), evidence: state.evidence });

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
  // To‘ldirilgan ulush: ko‘rinib turgan maydonlardagi qiymatlar va hali yetishmayotgan joylar bo‘yicha
  const filled = [...document.querySelectorAll("#docForm .field:not([hidden]) [data-k]")].filter(x => x.dataset.k !== "extra" && x.value.trim()).length;
  const pct = n === 0 ? 100 : Math.round(filled / (filled + n) * 100);
  el.innerHTML = `<span>${esc(n === 0 ? t("allFilled") : t("missingN", { n, list: state.missing.map(x => x.label).join(", ") }))}</span><span class="mbar" aria-hidden="true"><i style="width:${pct}%"></i></span>`;
  $("#dlNote").hidden = n === 0;
  $("#dlNote").textContent = n ? t("dlNote", { n }) : "";
  document.querySelectorAll(".field.need").forEach(f => { f.classList.remove("need"); f.querySelector("[data-k]")?.removeAttribute("aria-required"); });
  state.missing.forEach(x => { const f = document.querySelector(`[data-f="${x.k}"]`); if (f){ f.classList.add("need"); f.querySelector("[data-k]")?.setAttribute("aria-required", "true"); } });
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
  if (f.type === "phone" && !/^[+\d\s()-]{7,40}$/.test(v)) return t("errPhone");
  if ((f.type === "money" || f.type === "int") && !/^[\d\s\u00A0]+$/.test(v)) return t("errDigits");
  if (f.type === "int" && (Number(v) < (f.min ?? 0) || Number(v) > (f.max ?? 1000))) return t("errRange", { min: f.min ?? 0, max: f.max ?? 1000 });
  if (f.type === "date" && v > iso(new Date())) return t("errFuture");
  return "";
}
function formValid(){
  let ok = true;
  for (const el of document.querySelectorAll("#docForm [data-k]")){
    const f = fieldSpec(el.dataset.k); if (!f) continue;
    if (el.closest("[hidden]")) continue;                 // joriy qabul qiluvchida ko‘rinmaydigan maydon yuklab olishni to‘smaydi
    const msg = validateField(f, el.value.trim()), e = $("#e_" + f.k);
    if (e){ e.textContent = msg; e.hidden = !msg; }
    el.setAttribute("aria-invalid", String(!!msg));
    if (msg) ok = false;
  }
  return ok;
}

async function download(fmt){
  if (!formValid()){
    toast(t("fixRed"));
    const bad = $('#docForm [aria-invalid="true"]');
    bad?.closest("details")?.setAttribute("open", ""); bad?.focus();
    return;
  }
  const btn = fmt === "docx" ? $("#dlDocx") : $("#dlPdf"), label = btn.textContent;
  btn.disabled = true; btn.innerHTML = `<span class="spin" aria-hidden="true"></span> ${esc(label)}`;
  try {
    const res = await api(`/api/document/${fmt}`, docRequest());
    const name = (res.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/)?.[1] || `HuquqYol.${fmt}`;
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href:url, download:name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(state.missing.length ? t("dlDoneMissing", { fmt: fmt.toUpperCase(), n: state.missing.length }) : t("dlDone", { fmt: fmt.toUpperCase() }));
  } catch (e){ toast(e.message); }
  finally { btn.disabled = false; btn.textContent = label; }
}

/* ---------- Namuna bilan to‘ldirish (taqdimot va sinov uchun) ----------
   Faqat bo‘sh maydonlar to‘ldiriladi; foydalanuvchi yozganlari o‘zgarmaydi. */
const SAMPLE = {
  uz:{ fio:"Karimov Aziz Botirovich", address:"Toshkent sh., Chilonzor t., Bunyodkor ko‘chasi, 12-uy", phone:"+998 90 123 45 67",
       employer:"«Barakat Savdo» MChJ", boss:"Rahimov Bahodir Baxtiyorovich", empAddress:"Toshkent sh., Yunusobod t., Amir Temur ko‘chasi, 108",
       sellerAddress:"Toshkent sh., Yunusobod t., Amir Temur ko‘chasi, 108", respondent:"Aliyev Jasur Karimovich", respAddress:"Denov t., Navbahor MFY, 12-uy",
       respWork:"«Surxon Qurilish» MChJ", regNumber:"M-1245", violation:"yer uchastkasidan foydalanish huquqim", decisionNumber:"GA-0457812",
       debtor:"Tursunov Sardor Ilhomovich", debtorAddress:"Denov t., Bahor MFY, 5-uy" },
  ru:{ fio:"Каримов Азиз Ботирович", address:"г. Ташкент, Чиланзарский р-н, ул. Бунёдкор, д. 12", phone:"+998 90 123 45 67",
       employer:"ООО «Barakat Savdo»", boss:"Рахимов Баходир Бахтиёрович", empAddress:"г. Ташкент, Юнусабадский р-н, ул. Амира Темура, 108",
       sellerAddress:"г. Ташкент, Юнусабадский р-н, ул. Амира Темура, 108", respondent:"Алиев Жасур Каримович", respAddress:"Денауский р-н, МСГ «Навбахор», д. 12",
       respWork:"ООО «Surxon Qurilish»", regNumber:"М-1245", violation:"право пользования земельным участком", decisionNumber:"GA-0457812",
       debtor:"Турсунов Сардор Ильхомович", debtorAddress:"Денауский р-н, МСГ «Бахор», д. 5" }
};
const SAMPLE_NUM = { amount:"9000000", months:"3", price:"5000000", children:"2", income:"4000000", fine:"412000" };
function demoFill(){
  const m = scenarioMeta(state.scn), cur = form(), S = SAMPLE[LANG === "ru" ? "ru" : "uz"];
  const ago = days => { const d = new Date(); d.setDate(d.getDate() - days); return iso(d); };
  for (const f of [...state.meta.applicant, ...m.fields]){
    if (cur[f.k]) continue;
    let v = SAMPLE_NUM[f.k] ?? S[f.k];
    if (f.k === "demandDate") v = undefined;                               // talab sanasi — ixtiyoriy
    else if (f.type === "date") v = ago(240);
    else if (f.type === "select") v = f.options[0]?.v;
    else if (v == null && f.hint && f.type !== "date") v = f.hint;
    if (v == null) continue;
    if (LANG === "cyr" && S[f.k] === v) v = toCyr(v);
    setField(f.k, v);
  }
  persist(); renderDocView(); refreshPlan(false).catch(() => {});
  toast(t("demoFilled"));
}

/* ---------- Hodisalar ---------- */
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]");
  if (g && !g.disabled){ go(Number(g.dataset.go)); if (g.dataset.to) $("#" + g.dataset.to).scrollIntoView(); return; }
  const alt = e.target.closest("[data-alt]");
  if (alt){ const a = state.analysis || {}; choose({ ...a, scenario: alt.dataset.alt, confidence: 1, summary:"", missing:[], normIds:[], facts:{ form:{} }, source:"choice" }).catch(err => toast(err.message)); return; }
  const c = e.target.closest("[data-case]");
  if (c){ pickCase(c.dataset.case); return; }
  const dm = e.target.closest("[data-domain]");
  if (dm){ renderDomain(dm.dataset.domain); return; }
  if (e.target.closest("#allDomains")){ renderDomains(); $("#cases .case")?.focus(); return; }
  const ex = e.target.closest("[data-ex]");
  if (ex){ $("#problem").value = examples(LANG)[ex.dataset.ex]; $("#problem").focus(); return; }
  const lb = e.target.closest(".langsw [data-lang]");
  if (lb){ setLang(lb.dataset.lang); return; }
  const r = e.target.closest("#seg button");
  if (r){
    state.recipient = r.dataset.r; persist();
    document.querySelectorAll("#seg button").forEach(b => b.setAttribute("aria-pressed", String(b === r)));
    syncVisibility();
    renderHowto();
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
$("#moreEx").addEventListener("click", e => {
  $("#examples").classList.add("all"); e.currentTarget.hidden = true;
  $("#examples .chipbtn:nth-child(4)")?.focus();
});
$("#demoFill").addEventListener("click", demoFill);
$("#analyzeBtn").addEventListener("click", analyze);

// Belgi hisoblagichi: chegara yaqinlashganda ko‘rsatiladi
$("#problem").addEventListener("input", e => {
  const n = e.target.value.length, h = $("#askHint");
  h.classList.toggle("count", n > 3000); h.classList.toggle("over", n >= 4000);
  h.textContent = n > 3000 ? t("charCount", { n }) : t("askHint");
});

// Ovoz bilan kiritish (brauzer qo‘llasa). Matn tahrirlash uchun maydonga yoziladi, avtomatik yuborilmaydi.
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR){
  const mic = $("#micBtn"); mic.hidden = false;
  let rec = null;
  const stop = () => { rec?.stop(); };
  mic.addEventListener("click", () => {
    if (rec) return stop();
    rec = new SR();
    rec.lang = LANG === "ru" ? "ru-RU" : "uz-UZ";
    rec.interimResults = true; rec.continuous = true;
    const box = $("#problem"), before = box.value.trim();
    rec.onresult = ev => {
      const said = [...ev.results].map(r => r[0].transcript).join(" ").trim();
      box.value = (before ? before + " " : "") + said;
      box.dispatchEvent(new Event("input"));
    };
    rec.onerror = ev => { if (ev.error !== "aborted" && ev.error !== "no-speech") toast(t("voiceErr")); };
    rec.onend = () => { rec = null; mic.setAttribute("aria-pressed", "false"); box.focus(); };
    try { rec.start(); mic.setAttribute("aria-pressed", "true"); announce(t("voiceOn")); }
    catch { rec = null; toast(t("voiceErr")); }
  });
}
$("#problem").addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) analyze(); });
$("#dlDocx").addEventListener("click", () => download("docx"));
$("#dlPdf").addEventListener("click", () => download("pdf"));
$("#printBtn").addEventListener("click", () => window.print());
$("#copyTxt").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(docText()); toast(t("copied")); }
  catch { const rg = document.createRange(); rg.selectNodeContents($("#paper")); const s = getSelection(); s.removeAllRanges(); s.addRange(rg); toast(t("selected")); }
});
$("#dlgOk").addEventListener("click", () => $("#dlg").close("ok"));
$("#dlgNo").addEventListener("click", () => $("#dlg").close("no"));
$("#problem").addEventListener("input", () => { if (!$("#askErr").hidden) setAskErr(""); });
$("#wipe").addEventListener("click", async () => {
  if (!await confirmAction({ title:t("wipeT"), text:t("wipeP"), ok:t("del") })) return;
  store.clear(); try { localStorage.removeItem("huquqyol:v1"); } catch {} state.applicant = {}; state.formByScn = {}; toast(t("wiped")); setTimeout(() => { location.href = location.pathname; }, 600); });

/* ---------- Oflayn (PWA) ---------- */
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
window.addEventListener("offline", () => toast(t("offline")));
window.addEventListener("online", () => toast(t("online")));

/* ---------- Boshlash ---------- */
try {
  const embedded = document.getElementById("meta-data");
  state.meta = embedded ? JSON.parse(embedded.textContent) : await getJSON("/api/meta?lang=" + LANG);
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
  $("#cases").innerHTML = `<p class="error" role="alert">${esc(t("serverDown", { msg: e.message }))}</p>`;
}
