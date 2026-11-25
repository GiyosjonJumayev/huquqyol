// Profil rasmi muharriri: surish, kattalashtirish, burish — natija 480×480 JPEG. Sichqoncha, barmoq va klaviatura bilan ishlaydi.
// Rasm faqat brauzerda ishlanadi (canvas); serverga tayyor kvadrat yuboriladi.
const T = {
  uz:{ title:"Rasmni moslang", hint:"Rasmni suring. Klaviaturada: strelkalar — surish, + va − — o‘lcham.", zoom:"O‘lcham", rot:"90° burish", ok:"Saqlash", no:"Bekor qilish", area:"Rasm kadri" },
  cyr:{ title:"Расмни мосланг", hint:"Расмни суринг. Клавиатурада: стрелкалар — суриш, + ва − — ўлчам.", zoom:"Ўлчам", rot:"90° буриш", ok:"Сақлаш", no:"Бекор қилиш", area:"Расм кадри" },
  ru:{ title:"Настройте фото", hint:"Перетащите фото. С клавиатуры: стрелки — сдвиг, + и − — размер.", zoom:"Размер", rot:"Повернуть на 90°", ok:"Сохранить", no:"Отмена", area:"Кадр фото" }
};
const VIEW = 300, OUT = 480;

/** Faylni ochadi; foydalanuvchi saqlasa — data:image/jpeg, bekor qilsa — null. O‘qib bo‘lmasa — xato. */
export async function cropPhoto(file, lang = "uz"){
  const t = T[lang] || T.uz;
  let img = await createImageBitmap(file);
  if (Math.min(img.width, img.height) < 100) throw Object.assign(new Error("small"), { key:"small" });
  const d = document.createElement("dialog");
  d.className = "cropdlg"; d.setAttribute("aria-labelledby", "cropH");
  d.innerHTML = `<h2 id="cropH">${t.title}</h2><p class="small muted" id="cropHint">${t.hint}</p>
    <canvas class="cropview" width="${VIEW}" height="${VIEW}" tabindex="0" role="img" aria-label="${t.area}" aria-describedby="cropHint"></canvas>
    <div class="croprow"><label for="cropZoom">${t.zoom}</label><input id="cropZoom" type="range" min="1" max="4" step="0.02" value="1"><button class="btn ghost sm" type="button" data-rot>↻ ${t.rot}</button></div>
    <div class="rowbtn"><button class="btn primary" type="button" data-ok>${t.ok}</button><button class="btn ghost" type="button" data-no>${t.no}</button></div>`;
  document.body.append(d);
  const cv = d.querySelector("canvas"), g = cv.getContext("2d"), zoom = d.querySelector("#cropZoom");
  let z = 1, x = 0, y = 0;                                        // x, y — markazdan siljish (VIEW pikselida)
  const base = () => VIEW / Math.min(img.width, img.height);
  function clamp(){
    const w = img.width * base() * z, h = img.height * base() * z;
    x = Math.max(-(w - VIEW) / 2, Math.min((w - VIEW) / 2, x)); y = Math.max(-(h - VIEW) / 2, Math.min((h - VIEW) / 2, y));
  }
  function paint(ctx, size){
    const k = size / VIEW, w = img.width * base() * z * k, h = img.height * base() * z * k;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);       // shaffof PNG — oq fon
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (size - w) / 2 + x * k, (size - h) / 2 + y * k, w, h);
  }
  const draw = () => { clamp(); paint(g, VIEW); };
  const setZoom = v => { z = Math.max(1, Math.min(4, v)); zoom.value = z; draw(); };
  zoom.addEventListener("input", () => setZoom(Number(zoom.value)));
  let drag = null;
  cv.addEventListener("pointerdown", e => { drag = { px:e.clientX, py:e.clientY, x, y }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => { if (!drag) return; const k = VIEW / cv.getBoundingClientRect().width; x = drag.x + (e.clientX - drag.px) * k; y = drag.y + (e.clientY - drag.py) * k; draw(); });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, () => { drag = null; });
  cv.addEventListener("wheel", e => { e.preventDefault(); setZoom(z * (e.deltaY < 0 ? 1.08 : 0.93)); }, { passive:false });
  cv.addEventListener("keydown", e => {
    const m = { ArrowLeft:[-10, 0], ArrowRight:[10, 0], ArrowUp:[0, -10], ArrowDown:[0, 10] }[e.key];
    if (m){ x += m[0]; y += m[1]; draw(); } else if (e.key === "+" || e.key === "=") setZoom(z + .1); else if (e.key === "-") setZoom(z - .1); else return;
    e.preventDefault();
  });
  d.querySelector("[data-rot]").addEventListener("click", async () => {
    const c = document.createElement("canvas"); c.width = img.height; c.height = img.width;
    const r = c.getContext("2d"); r.translate(c.width / 2, c.height / 2); r.rotate(Math.PI / 2); r.drawImage(img, -img.width / 2, -img.height / 2);
    img = c; x = y = 0; draw();
  });
  draw(); d.showModal(); cv.focus();
  return new Promise(done => {
    let res = null;
    d.querySelector("[data-ok]").addEventListener("click", () => {
      const o = document.createElement("canvas"); o.width = o.height = OUT;
      paint(o.getContext("2d"), OUT); res = o.toDataURL("image/jpeg", 0.88); d.close();
    });
    d.querySelector("[data-no]").addEventListener("click", () => d.close());
    d.addEventListener("close", () => { d.remove(); done(res); });
  });
}
