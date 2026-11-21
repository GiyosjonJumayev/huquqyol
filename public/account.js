// Hisob sahifalari (kirish, ro‘yxat, «Hisobim», admin, katalog, tariflar): formalar va tugmalar JSON API ga.
//  <form data-api="/api/..." data-next="/hisob">  — maydonlar JSON bo‘lib yuboriladi (checkbox → true/false)
//  <button data-post="/api/..." data-body='{"plan":"pro"}'> — bitta amal; muvaffaqiyatda sahifa yangilanadi yoki next ga o‘tiladi
const lang = document.documentElement.dataset.lang || "uz";
const NET = { uz:"Internet aloqasi yo‘q. Qayta urinib ko‘ring.", cyr:"Интернет алоқаси йўқ. Қайта уриниб кўринг.", ru:"Нет соединения. Попробуйте ещё раз." };
const ERR = { uz:"Xatolik yuz berdi.", cyr:"Хатолик юз берди.", ru:"Произошла ошибка." };

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
  const body = {};
  for (const el of f.elements){
    if (!el.name || el.disabled || el.closest("[hidden]")) continue;
    if (el.type === "checkbox") body[el.name] = el.checked;
    else if (el.type === "radio"){ if (el.checked) body[el.name] = el.value; }
    else body[el.name] = el.value;
  }
  const btn = f.querySelector('[type="submit"]');
  showErr(f, ""); if (btn) btn.disabled = true;
  try {
    const d = await send(f.dataset.api, body);
    if (f.dataset.ok){ const m = f.querySelector("[data-ok-msg]"); if (m){ m.textContent = f.dataset.ok; m.hidden = false; } f.reset(); }
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
