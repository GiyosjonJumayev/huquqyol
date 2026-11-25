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

async function send(url, body){
  let r;
  try { r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ...body, lang }), credentials:"same-origin" }); }
  catch { throw new Error(NET[lang] || NET.uz); }
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) throw new Error(data.error || ERR[lang] || ERR.uz);
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
    if (!el.name || el.disabled || el.closest("[hidden]")) continue;
    const arr = /^(\w+)\[\]$/.exec(el.name), row = /^(\w+)\[(\d+)\]\[(\w+)\]$/.exec(el.name);
    const val = el.type === "checkbox" && !arr ? el.checked : el.value;
    if (arr){ (body[arr[1]] ||= []); if (el.checked) body[arr[1]].push(el.value); }
    else if (row){ const list = (body[row[1]] ||= []); (list[+row[2]] ||= {})[row[3]] = val; }
    else if (el.type === "radio"){ if (el.checked) body[el.name] = el.value; }
    else body[el.name] = val;
  }
  for (const k of Object.keys(body)) if (Array.isArray(body[k])) body[k] = body[k].filter(x => x !== undefined);
  const btn = f.querySelector('[type="submit"]');
  showErr(f, ""); const okEl = f.querySelector("[data-ok-msg]"); if (okEl) okEl.hidden = true;
  if (btn) btn.disabled = true;
  try {
    const d = await send(f.dataset.api, body);
    if (f.dataset.ok){ if (okEl){ okEl.textContent = f.dataset.ok + (d.recheck ? ` ${MOD[lang] || MOD.uz}` : ""); okEl.hidden = false; } if (!("reload" in f.dataset)) f.reset(); }
    else go(f.dataset.next || d.next);
  } catch (x){ showErr(f, x.message); }
  finally { if (btn) btn.disabled = false; }
});

document.addEventListener("click", async e => {
  const b = e.target.closest("button[data-post]"); if (!b) return;
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

