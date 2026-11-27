// Hisob sahifalari (kirish, ro‘yxat, «Hisobim», admin, katalog, tariflar): formalar va tugmalar JSON API ga.
//  <form data-api="/api/..." data-next="/hisob">  — maydonlar JSON bo‘lib yuboriladi (checkbox → true/false)
//  <button data-post="/api/..." data-body='{"plan":"pro"}'> — bitta amal; muvaffaqiyatda sahifa yangilanadi yoki next ga o‘tiladi
import { mountA11y } from "/a11y.js";
import "/session.js";
const lang = document.documentElement.dataset.lang || "uz";
mountA11y({ lang });                                 // «Aa Qulaylik» oynasi (shrift, ovoz, mavzu) — bosh sahifadagi bilan bir xil
const NET = { uz:"Internet aloqasi yo‘q. Qayta urinib ko‘ring.", cyr:"Интернет алоқаси йўқ. Қайта уриниб кўринг.", ru:"Нет соединения. Попробуйте ещё раз." };
const ERR = { uz:"Nimadir ishlamadi. Qayta urinib ko‘ring.", cyr:"Нимадир ишламади. Қайта уриниб кўринг.", ru:"Что-то пошло не так. Попробуйте ещё раз." };
const MOD = { uz:"Profil moderatsiyaga yuborildi.", cyr:"Профил модерацияга юборилди.", ru:"Профиль отправлен на модерацию." };

// Yurist rasmi: muharrir (surish, kattalashtirish, burish) → 480×480 JPEG → server. Sahifa yangilanmaydi.
const PH = { small:{ uz:"Rasm juda kichik: kamida 100×100 piksel bo‘lsin.", cyr:"Расм жуда кичик: камида 100×100 пиксел бўлсин.", ru:"Фото слишком маленькое: минимум 100×100 пикселей." },
  read:{ uz:"Bu faylni rasm sifatida ochib bo‘lmadi. JPEG, PNG yoki WEBP tanlang.", cyr:"Бу файлни расм сифатида очиб бўлмади. JPEG, PNG ёки WEBP танланг.", ru:"Не удалось открыть файл как фото. Выберите JPEG, PNG или WEBP." },
  ok:{ uz:"Rasm saqlandi.", cyr:"Расм сақланди.", ru:"Фото сохранено." } };
async function uploadPhoto(box, file, url){
  const ok = box.querySelector("[data-photo-ok]"); showErr(box, ""); if (ok) ok.textContent = "";
  let data;
  try { const { cropPhoto } = await import("/cropper.js"); data = await cropPhoto(file, lang); }
  catch (x){ showErr(box, (x?.key === "small" ? PH.small : PH.read)[lang] || PH.read.uz); return; }
  if (!data) return;
  box.classList.add("busyphoto");
  try {
    const d = await send(url, { data });
    document.querySelectorAll("[data-photo-img]").forEach(cur => {
      const img = document.createElement("img"); img.className = "ava big photo"; img.alt = ""; img.width = img.height = cur.width || 120; img.src = d.url; img.setAttribute("data-photo-img", ""); cur.replaceWith(img);
    });
    box.querySelectorAll("[data-photo-del]").forEach(x => { x.hidden = false; });
    box.querySelectorAll("[data-photo-state]").forEach(x => { x.hidden = true; });
    if (ok) ok.textContent = PH.ok[lang] || PH.ok.uz;
  } catch (x){ showErr(box, x.message); }
  finally { box.classList.remove("busyphoto"); }
}
document.addEventListener("change", e => {
  const inp = e.target.closest("input[type=file][data-photo]"); if (!inp?.files?.[0]) return;
  const file = inp.files[0]; inp.value = "";
  uploadPhoto(inp.closest("[data-photo-box]") || document.body, file, inp.dataset.photo);
});
for (const box of document.querySelectorAll("[data-photo-box]")){
  const over = v => box.classList.toggle("dragover", v);
  box.addEventListener("dragover", e => { if ([...(e.dataTransfer?.types || [])].includes("Files")){ e.preventDefault(); over(true); } });
  box.addEventListener("dragleave", e => { if (!box.contains(e.relatedTarget)) over(false); });
  box.addEventListener("drop", e => { const f = e.dataTransfer?.files?.[0]; over(false); if (!f) return; e.preventDefault(); uploadPhoto(box, f, box.querySelector("[data-photo]").dataset.photo); });
}

// Profil: yo‘nalish belgilanishi bilan shu sohaning hujjatlari soni va namunalari darhol ko‘rinadi
const prData = document.getElementById("practice-data"), prBox = document.getElementById("practicePrev");
if (prData && prBox){
  const P = JSON.parse(prData.textContent), el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; };
  const draw = () => {
    const ids = [...document.querySelectorAll('input[name="areas[]"]:checked')].map(x => x.value).filter(x => P.areas[x]);
    prBox.replaceChildren(...(ids.length ? ids.map(id => {
      const a = P.areas[id], c = el("article", "pcard");
      c.append(el("h3", "", a.title));
      const p = el("p", "chips2"); for (const k of ["law", "reg", "order", "plenum", "tpl"]) if (a[k]) p.append(el("span", "chip", `${P.labels[k]}: ${a[k]}`));
      const ul = el("ul", "small muted"); for (const x of a.top) ul.append(el("li", "", x));
      c.append(p, ul); return c;
    }) : [el("p", "empty", P.labels.none)]));
  };
  document.addEventListener("change", e => { if (e.target.name === "areas[]") draw(); });
  draw();
}

const SURE = { uz:"Aniqmi? Yana bosing", cyr:"Аниқми? Яна босинг", ru:"Точно? Нажмите ещё раз" };
async function send(url, body){
  let r;
  try { r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ...body, lang }), credentials:"same-origin" }); }
  catch { throw new Error(NET[lang] || NET.uz); }
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(data.error || ERR[lang] || ERR.uz), { data });
  return data;
}
const showErr = (scope, msg) => { const e = scope.querySelector("[data-err]") || scope.parentElement?.querySelector("[data-err]"); if (e){ e.textContent = msg; e.hidden = !msg; } };
const go = next => { if (next) location.assign(next); else location.reload(); };

document.addEventListener("submit", async e => {
  const f = e.target.closest("form[data-api]"); if (!f) return;
  e.preventDefault();
  // Maydonlar: «areas[]» — belgilanganlar ro‘yxati; «services[0][name]» — jadval qatorlari; checkbox — true/false
  const body = {};
  for (const el of f.elements){
    if (!el.name || el.disabled || (el.type !== "hidden" && el.closest("[hidden]"))) continue;
    const arr = /^(\w+)\[\]$/.exec(el.name), row = /^(\w+)\[(\d+)\]\[(\w+)\]$/.exec(el.name);
    const val = el.type === "checkbox" && !arr ? el.checked : el.value;
    if (arr){ (body[arr[1]] ||= []); if (el.checked) body[arr[1]].push(el.value); }
    else if (row){ const list = (body[row[1]] ||= []); (list[+row[2]] ||= {})[row[3]] = val; }
    else if (el.type === "radio"){ if (el.checked) body[el.name] = el.value; }
    else body[el.name] = val;
  }
  for (const k of Object.keys(body)) if (Array.isArray(body[k])) body[k] = body[k].filter(x => x !== undefined);
  // Yuristga so‘rov: fuqaro belgilagan bo‘lsa, shu brauzerdagi reja va ariza ma’lumotlari qo‘shiladi
  if ("case" in f.dataset && body.shareCase === true){ const s = savedCase(); if (s) body.case = caseBody(s); else body.shareCase = false; }
  const btn = f.querySelector('[type="submit"]');
  showErr(f, ""); const okEl = f.querySelector("[data-ok-msg]"); if (okEl) okEl.hidden = true;
  if (btn) btn.disabled = true;
  try {
    const d = await send(f.dataset.api, body);
    if (f.dataset.result) showResult(document.getElementById(f.dataset.result), d, f);
    else if (f.dataset.ok){ if (okEl){ okEl.textContent = f.dataset.ok + (d.recheck ? ` ${MOD[lang] || MOD.uz}` : ""); okEl.hidden = false; } if (!("reload" in f.dataset)) f.reset(); }
    else go(f.dataset.next || d.next);
  } catch (x){
    showErr(f, x.message);
    if (x.data?.need === "code"){ const c = f.querySelector("[data-code]"); if (c){ c.hidden = false; const i = c.querySelector("input"); i.required = true; i.value = ""; i.focus(); } }
  }
  finally { if (btn) btn.disabled = false; }
});
// Server javobini sahifadagi yashirin blokka joylash (2FA kaliti, zaxira kodlar, taklif havolasi)
function showResult(box, d, f){
  if (!box) return;
  for (const el of box.querySelectorAll("[data-fill]")){ const v = d[el.dataset.fill] || ""; el.textContent = "abs" in el.dataset ? location.origin + v : v; }
  for (const el of box.querySelectorAll("[data-fill-href]")) if (/^otpauth:\/\//.test(d[el.dataset.fillHref] || "")) el.href = d[el.dataset.fillHref];
  for (const el of box.querySelectorAll("[data-fill-list]")) el.replaceChildren(...(d[el.dataset.fillList] || []).map(x => { const li = document.createElement("li"); li.textContent = x; return li; }));
  box.hidden = false;
  if (!box.contains(f) && !f.contains(box)) f.hidden = true;
  else f.reset();
  box.querySelector("input, a, h3")?.focus?.();
}
// To‘lov holati: provayderdan qaytgach sahifa o‘zi yangilanadi (10 daqiqagacha, faqat oyna ochiq bo‘lganda)
const pay = document.querySelector("[data-pay-status]");
if (pay){
  const until = Date.now() + 10 * 60e3;
  const tick = async () => {
    if (Date.now() > until) return;
    if (!document.hidden) try { const d = await (await fetch(pay.dataset.payStatus, { credentials:"same-origin", cache:"no-store" })).json(); if (d.status && d.status !== "pending") return location.reload(); } catch {}
    setTimeout(tick, 4000);
  };
  setTimeout(tick, 4000);
}

document.addEventListener("click", async e => {
  const b = e.target.closest("button[data-post]"); if (!b) return;
  if ("confirm" in b.dataset && b.dataset.armed !== "1"){ b.dataset.armed = "1"; b.textContent = SURE[lang] || SURE.uz; setTimeout(() => { b.dataset.armed = ""; }, 5000); return; }
  let body = {}; try { body = b.dataset.body ? JSON.parse(b.dataset.body) : {}; } catch {}
  b.disabled = true;
  try { const d = await send(b.dataset.post, body); go(d.next); }
  catch (x){ showErr(b.closest("li, article, form, div") || document.body, x.message); b.disabled = false; }
});

// Navbar: ochiladigan menyular tashqariga bosilganda yoki Esc bilan yopiladi
document.addEventListener("click", e => { document.querySelectorAll("details.navdd[open]").forEach(d => { if (!d.contains(e.target)) d.removeAttribute("open"); }); });
document.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll("details.navdd[open]").forEach(d => { d.removeAttribute("open"); d.querySelector("summary")?.focus(); }); });

// Ro‘yxatdan o‘tish: «Tashkilot» tanlanganda tashkilot maydonlari ko‘rinadi
document.addEventListener("change", e => {
  const r = e.target.closest('input[data-toggle]'); if (!r) return;
  const g = document.querySelector(`[data-group="${r.dataset.toggle}"]`);
  if (g) g.hidden = r.dataset.show !== "true";
});


// ---------- Ish paketi: bosh sahifada tayyorlangan reja va ariza (faqat shu brauzerda) → tanlangan yuristga ----------
const CASE_T = {
  fields: { uz:"To‘ldirilgan ariza maydonlari: {n}", cyr:"Тўлдирилган ариза майдонлари: {n}", ru:"Заполнено полей заявления: {n}" },
  ev: { uz:"Belgilangan dalillar: {n}", cyr:"Белгиланган далиллар: {n}", ru:"Отмечено доказательств: {n}" },
  date: { uz:"Muddat hisoblanadigan sana: {d}", cyr:"Муддат ҳисобланадиган сана: {d}", ru:"Дата начала отсчёта срока: {d}" },
  saved: { uz:"Saqlangan: {d}", cyr:"Сақланган: {d}", ru:"Сохранено: {d}" }
};
const ct = (k, v) => (CASE_T[k][lang] || CASE_T[k].uz).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "");
function savedCase(){ try { const s = JSON.parse(localStorage.getItem("huquqyol:v2")); return s?.scn ? s : null; } catch { return null; } }
function caseBody(s){
  const form = {};
  for (const [k, v] of Object.entries({ ...(s.applicant || {}), ...(s.formByScn?.[s.scn] || {}) })) if (!k.startsWith("_") && v !== "" && v != null) form[k] = v;
  return { scenario: s.scn, recipient: s.recipient, triggerDate: s.trigger, form, evidence: Array.isArray(s.evidence) ? s.evidence : [], lang };
}
for (const f of document.querySelectorAll("form[data-case]")){
  const s = savedCase(), want = f.dataset.case;
  const box = f.querySelector("[data-case-box]"), none = f.querySelector("[data-case-none]");
  if (!s || (want && want !== s.scn)){ if (none) none.hidden = false; continue; }
  const b = caseBody(s), list = box.querySelector("[data-case-sum]");
  const items = [ct("fields", { n: Object.keys(b.form).length }), ct("ev", { n: b.evidence.length })];
  if (b.triggerDate) items.push(ct("date", { d: b.triggerDate.split("-").reverse().join(".") }));
  if (s.at){ const d = new Date(s.at), z = n => String(n).padStart(2, "0"); items.push(ct("saved", { d: `${z(d.getDate())}.${z(d.getMonth() + 1)}.${d.getFullYear()}` })); }
  list.replaceChildren(...items.map(x => Object.assign(document.createElement("li"), { textContent: x })));
  box.hidden = false;
  const cb = box.querySelector('[name="shareCase"]'), msg = f.querySelector("[data-case-optional]");
  const sync = () => { if (msg){ msg.required = !cb.checked; msg.minLength = cb.checked ? 0 : 10; } };
  cb.addEventListener("change", sync); sync();
}
