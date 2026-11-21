// Hisob sahifalari (kirish, ro‘yxat, «Hisobim», admin, katalog, tariflar): formalar va tugmalar JSON API ga.
//  <form data-api="/api/..." data-next="/hisob">  — maydonlar JSON bo‘lib yuboriladi (checkbox → true/false)
//  <button data-post="/api/..." data-body='{"plan":"pro"}'> — bitta amal; muvaffaqiyatda sahifa yangilanadi yoki next ga o‘tiladi
const lang = document.documentElement.dataset.lang || "uz";
const NET = { uz:"Internet aloqasi yo‘q. Qayta urinib ko‘ring.", cyr:"Интернет алоқаси йўқ. Қайта уриниб кўринг.", ru:"Нет соединения. Попробуйте ещё раз." };
const ERR = { uz:"Xatolik yuz berdi.", cyr:"Хатолик юз берди.", ru:"Произошла ошибка." };
const MOD = { uz:"Profil moderatsiyaga yuborildi.", cyr:"Профил модерацияга юборилди.", ru:"Профиль отправлен на модерацию." };

// Yurist rasmi: brauzerda markazdan kvadrat qilib 480×480 ga kichraytiriladi (JPEG), keyin yuboriladi
document.addEventListener("change", async e => {
  const inp = e.target.closest("input[type=file][data-photo]"); if (!inp?.files?.[0]) return;
  const box = inp.closest("section, form, div") || document.body;
  showErr(box, "");
  try {
    const bmp = await createImageBitmap(inp.files[0]);
    const side = Math.min(bmp.width, bmp.height), size = Math.min(480, side);
    const c = document.createElement("canvas"); c.width = c.height = size;
    c.getContext("2d").drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
    const data = c.toDataURL("image/jpeg", 0.86);
    const d = await send(inp.dataset.photo, { data });
    const cur = document.querySelector("[data-photo-img]");
    if (cur){ const img = document.createElement("img"); img.className = "ava big photo"; img.alt = ""; img.width = img.height = 120; img.src = d.url; img.setAttribute("data-photo-img", ""); cur.replaceWith(img); }
    setTimeout(() => location.reload(), 600);
  } catch (x){ showErr(box, x?.message || ERR[lang] || ERR.uz); }
  finally { inp.value = ""; }
});

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

// Mavzu: yorug‘ ↔ qorong‘i (sahifani qayta yuklamasdan); tanlov cookie da — server keyingi sahifani shu mavzuda chizadi
document.addEventListener("click", e => {
  const b = e.target.closest("[data-theme-toggle]"); if (!b) return;
  e.preventDefault();
  const root = document.documentElement, cur = root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = cur === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  document.cookie = `hy_theme=${next}; path=/; max-age=31536000; samesite=lax`;
});
