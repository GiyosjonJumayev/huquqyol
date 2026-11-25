// Kabinetdagi «Yo‘nalishim» bo‘limi: yurist sohasini tanlaydi — shu sohaning qonun, nizom, buyruq va Plenum qarorlari,
// to‘ldiriladigan shablonlar, normalar, muddat hisobi, idoralar va ish ro‘yxati darhol paydo bo‘ladi (sahifa yangilanmaydi).
// Baza bir marta olinadi (/api/practice); tanlov yurist profilida saqlanadi (/api/lawyer/areas), tashkilotda — kabinet ma’lumotida.
import { esc } from "/shared.js";
import { toCyrillic as toCyr } from "/translit.js";

export function createPractice({ L, LANG, state, save, say, go, showDate, iso, customDoc }){
  let D = null, loading = null, failed = "";
  let mine = [], view = "", sec = "acts", q = "", type = "", onlySaved = false, tpl = null, vals = {}, pickClient = "", pickCase = "", calc = {};
  const $ = id => document.getElementById(id);
  const S = () => state();
  const cy = s => LANG === "cyr" ? toCyr(s) : s;

  async function load(){
    try {
      const r = await fetch("/api/practice", { credentials:"same-origin" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || L("Baza yuklanmadi.", "База не загрузилась."));
      D = d; failed = "";
      mine = (d.mine ?? S().areas ?? []).filter(a => d.areas.some(x => x.id === a));
    } catch (x){ failed = x.message || L("Internet aloqasi yo‘q.", "Нет соединения."); }
    loading = null;
  }
  const areaTitle = id => D.areas.find(a => a.id === id)?.title || id;
  const scope = () => view && mine.includes(view) ? [view] : mine;
  const hit = x => x.areas.some(a => scope().includes(a));
  const saved = () => new Set(S().saved || []);
  const norm = s => String(s).toLowerCase().replace(/[‘’ʻʼ'`]/g, "");
  const match = (...parts) => !q || norm(parts.join(" ")).includes(norm(q));
  const tags = x => x.common ? `<span class="small muted">${esc(L("barcha yo‘nalishlar", "все направления"))}</span>` : x.areas.filter(a => mine.includes(a)).map(a => `<span class="ptag">${esc(areaTitle(a))}</span>`).join(" ");
  const counts = a => ({ acts: D.acts.filter(x => x.areas.includes(a)).length, tpl: D.templates.filter(x => x.areas.includes(a)).length });

  const SECS = () => [
    ["acts", L("Qonun va hujjatlar", "Законы и акты"), D.acts.filter(hit).length],
    ["tpl", L("Shablonlar", "Шаблоны"), D.templates.filter(hit).length],
    ["norms", L("Muhim moddalar", "Ключевые нормы"), D.norms.filter(hit).length],
    ["terms", L("Muddatlar", "Сроки"), D.scenarios.filter(hit).length],
    ["offices", L("Idoralar", "Органы"), D.offices.filter(hit).length],
    ["check", L("Ish ro‘yxati", "Чек-лист"), scope().length]
  ].filter(s => s[2] || s[0] === "acts");

  // ---------- Ko‘rinish ----------
  function html(){
    if (failed) return `<p class="note warn" role="alert">${esc(failed)}</p><p><button class="btn ghost" type="button" data-pact="retry">${esc(L("Qayta urinish", "Повторить"))}</button></p>`;
    if (!D) return `<div class="skeleton" aria-hidden="true"></div><p class="sr" role="status">${esc(L("Yuklanmoqda…", "Загрузка…"))}</p>`;
    const chips = D.areas.map(a => { const c = counts(a.id), on = mine.includes(a.id);
      return `<button class="parea" type="button" data-pact="area" data-id="${a.id}" aria-pressed="${on}"><b>${esc(a.title)}</b><span>${esc(L(`${c.acts} hujjat · ${c.tpl} shablon`, `${c.acts} актов · ${c.tpl} шаблонов`))}</span></button>`; });
    const picker = `<div class="pareas" role="group" aria-label="${esc(L("Yo‘nalishlar", "Направления"))}">${chips.join("")}</div>`;
    if (!mine.length) return `<section class="card"><h2>${esc(L("Yo‘nalishingizni tanlang", "Выберите направление"))}</h2>
      <p class="muted">${esc(L("Tanlashingiz bilan shu sohaning qonun, nizom va buyruqlari, shablonlari va muddatlari shu yerda paydo bo‘ladi. Bir nechtasini tanlash mumkin.", "Сразу после выбора здесь появятся законы, положения, приказы, шаблоны и сроки этой сферы. Можно выбрать несколько."))}</p>${picker}</section>`;
    const secs = SECS(); if (!secs.some(s => s[0] === sec)) sec = "acts";
    return `<details class="card pedit"><summary><b>${esc(L("Yo‘nalishlarim", "Мои направления"))}:</b> ${mine.map(a => `<span class="ptag">${esc(areaTitle(a))}</span>`).join(" ")} <span class="linkbtn">${esc(L("O‘zgartirish", "Изменить"))}</span></summary>${picker}</details>
      ${mine.length > 1 ? `<div class="pview" role="group" aria-label="${esc(L("Yo‘nalish bo‘yicha", "По направлению"))}">${[["", L("Barchasi", "Все")], ...mine.map(a => [a, areaTitle(a)])].map(([id, t]) => `<button class="chipbtn" type="button" data-pact="view" data-id="${id}" aria-pressed="${view === id}">${esc(t)}</button>`).join("")}</div>` : ""}
      <nav class="psecs" aria-label="${esc(L("Yo‘nalish bo‘limlari", "Разделы направления"))}">${secs.map(([id, t, n]) => `<button type="button" data-pact="sec" data-id="${id}"${id === sec ? ` aria-current="true"` : ""}>${esc(t)} <span class="pn">${n}</span></button>`).join("")}</nav>
      <div id="pbody">${body()}</div>
      <p class="small muted">${esc(L(`Hujjatlar lex.uz bo‘yicha tekshirilgan: ${D.checked}. Foydalanishdan oldin amaldagi tahrirni havolada ko‘ring.`, `Акты сверены с lex.uz: ${D.checked}. Перед применением проверьте действующую редакцию по ссылке.`))}</p>`;
  }
  const body = () => ({ acts, tpl: tpls, norms, terms, offices, check })[sec]();
  const search = ph => `<input id="p_q" type="search" value="${esc(q)}" placeholder="${esc(ph)}" aria-label="${esc(ph)}" autocomplete="off">`;
  const none = () => `<p class="empty">${esc(L("Hech narsa topilmadi.", "Ничего не найдено."))}</p>`;

  function acts(){
    const all = D.acts.filter(hit), sv = saved();
    return `<div class="kfilter">${search(L("Nomi yoki raqami bo‘yicha qidiring", "Поиск по названию или номеру"))}</div>
      <div class="pview" role="group" aria-label="${esc(L("Hujjat turi", "Тип акта"))}">${[{ id:"", title:L("Hammasi", "Все") }, ...D.types].map(t => { const n = t.id ? all.filter(x => x.type === t.id).length : all.length;
        return n ? `<button class="chipbtn" type="button" data-pact="type" data-id="${t.id}" aria-pressed="${type === t.id}">${esc(t.title)} <span class="pn">${n}</span></button>` : ""; }).join("")}
        <button class="chipbtn" type="button" data-pact="saved" aria-pressed="${onlySaved}">★ ${esc(L("Saqlanganlar", "Избранное"))} <span class="pn">${all.filter(x => sv.has(x.id)).length}</span></button></div>
      <div id="plist">${actList()}</div>`;
  }
  function actList(){
    const sv = saved(), lib = new Set(S().org.docs.map(d => d.url));
    const list = D.acts.filter(hit).filter(x => (!type || x.type === type) && (!onlySaved || sv.has(x.id)) && match(x.title, x.num));
    if (!list.length) return none();
    return D.types.filter(t => list.some(x => x.type === t.id)).map(t => `<h2 class="sec">${esc(t.title)}</h2><ul class="klist pacts">${list.filter(x => x.type === t.id)
      .sort((a, b) => a.common - b.common || (b.date || "").localeCompare(a.date || "")).map(x => `<li><div>
        ${x.isNew ? `<span class="tag pnew">${esc(L("Yangi", "Новое"))}</span> ` : ""}<b>${esc(x.title)}</b>
        <br><span class="small muted">${[x.num && `№ ${x.num}`, x.date && showDate(x.date)].filter(Boolean).map(esc).join(" · ")}</span> ${tags(x)}
        <br><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(new URL(x.url).hostname)} ↗<span class="sr"> — ${esc(x.title)}, ${esc(L("yangi oynada", "в новом окне"))}</span></a></div>
        <div class="rowbtn"><button class="pstar" type="button" data-pact="star" data-id="${x.id}" aria-pressed="${sv.has(x.id)}" aria-label="${esc(L("Saqlash", "В избранное"))}: ${esc(x.title)}">${sv.has(x.id) ? "★" : "☆"}</button>
        ${lib.has(x.url) ? `<span class="small muted">✓ ${esc(L("Kutubxonada", "В библиотеке"))}</span>` : `<button class="linkbtn" type="button" data-pact="lib" data-id="${x.id}">${esc(L("Kutubxonaga", "В библиотеку"))}</button>`}</div></li>`).join("")}</ul>`).join("");
  }

  // ---------- Shablonlar: maydonlar profil, mijoz va ishdan avtomatik to‘ladi, ko‘rinish darhol yangilanadi ----------
  function tpls(){
    if (tpl) return editor();
    return `<div class="kfilter">${search(L("Shablon nomi", "Название шаблона"))}</div><div id="plist">${tplList()}</div>`;
  }
  function tplList(){
    const list = D.templates.filter(hit).filter(t => match(t.name, t.title));
    const group = (t, items) => items.length ? `<h2 class="sec">${esc(t)}</h2><ul class="klist">${items.map(x => `<li><div><b>${esc(x.name)}</b> ${tags(x)}<br><span class="small muted">${esc(cy(x.title))}</span></div>
      <div class="rowbtn"><button class="btn primary sm" type="button" data-pact="fill" data-id="${x.id}">${esc(L("To‘ldirish", "Заполнить"))}<span class="sr">: ${esc(x.name)}</span></button></div></li>`).join("")}</ul>` : "";
    return list.length ? group(L("Yo‘nalish shablonlari", "Шаблоны направления"), list.filter(x => !x.common)) + group(L("Umumiy advokat hujjatlari", "Общие документы адвоката"), list.filter(x => x.common)) : none();
  }
  function autofill(){
    const c = S().clients.find(x => x.id === pickClient), k = S().cases.find(x => x.id === pickCase);
    const src = { prof: D.profile, client: c || {}, case: k || {} };
    for (const f of tpl.fields){ const [a, b] = (D.fields[f].src || "").split("."); const v = a && src[a]?.[b]; if (v && !vals[f]) vals[f] = v; }
    if (tpl.fields.includes("date") && !vals.date) vals.date = showDate(iso());
  }
  function editor(){
    const inp = k => { const f = D.fields[k], id = `pf_${k}`;
      return `<div class="field"><label for="${id}">${esc(f.label)}</label>${f.type === "area" ? `<textarea id="${id}" data-pf="${k}" rows="4" maxlength="4000">${esc(vals[k] || "")}</textarea>` : `<input id="${id}" data-pf="${k}" type="${f.type === "tel" ? "tel" : "text"}" value="${esc(vals[k] || "")}" maxlength="300" autocomplete="off">`}</div>`; };
    const opts = (list, cur, t) => `<option value="">—</option>${list.map(x => `<option value="${x.id}"${x.id === cur ? " selected" : ""}>${esc(x[t])}</option>`).join("")}`;
    return `<p><button class="linkbtn" type="button" data-pact="back">← ${esc(L("Shablonlar", "Шаблоны"))}</button></p>
      <div class="pedgrid"><form class="card kform" id="pform"><h2 id="pfH" tabindex="-1">${esc(tpl.name)}</h2>
        <div class="grid2"><div class="field"><label for="p_client">${esc(L("Mijozdan to‘ldirish", "Заполнить из клиента"))}</label><select id="p_client">${opts(S().clients, pickClient, "name")}</select></div>
        <div class="field"><label for="p_case">${esc(L("Ishdan to‘ldirish", "Заполнить из дела"))}</label><select id="p_case">${opts(S().cases, pickCase, "title")}</select></div></div>
        ${tpl.fields.map(inp).join("")}
        <div class="rowbtn"><button class="btn primary" type="button" data-pact="dl" data-fmt="docx">DOCX</button><button class="btn ghost" type="button" data-pact="dl" data-fmt="pdf">PDF</button>
          <button class="linkbtn" type="button" data-pact="copy">${esc(L("Shablonlarimga nusxalash", "Скопировать в мои шаблоны"))}</button></div>
        <p class="small muted">${esc(L("Bu — tayyor skelet. Topshirishdan oldin huquqiy asoslarni o‘zingiz tekshiring.", "Это готовый каркас. Перед подачей проверьте правовые основания."))}</p><p class="err" id="p_err" role="alert" hidden></p></form>
      <div class="pprev"><div class="paper" id="ppaper" aria-label="${esc(L("Hujjat ko‘rinishi", "Предпросмотр документа"))}">${paper()}</div></div></div>`;
  }
  // Matnni to‘ldirish: ko‘p qatorli qiymat — alohida xatboshilar; bo‘sh maydon — [yorliq]
  const fillText = s => s.replace(/\{\{(\w+)\}\}/g, (_, k) => (vals[k] || "").trim() ? vals[k].trim().replace(/\n+/g, "\n\n") : `[${D.fields[k].label}]`);
  const fillHtml = s => esc(cy(fillText(s))).replace(/\[([^\]\n]{2,80})\]/g, `<span class="ph">$1</span>`);
  const paper = () => `${tpl.to.length ? `<div class="addr">${tpl.to.map(l => `<div>${fillHtml(l)}</div>`).join("")}</div>` : ""}<div class="ttl">${esc(cy(tpl.title))}</div>${fillText(tpl.text).split(/\n{2,}/).map(p => `<p>${fillHtml(p)}</p>`).join("")}`;
  const ownSign = () => /_{6,}/.test(tpl.text);

  function norms(){
    return `<div class="kfilter">${search(L("Modda yoki matn bo‘yicha", "По статье или тексту"))}</div><div id="plist">${normList()}</div>`;
  }
  function normList(){
    const list = D.norms.filter(hit).filter(n => match(n.title, n.text, n.law, n.article));
    return list.length ? `<ul class="klist">${list.map(n => `<li><div><span class="small muted">${esc([n.law, n.article].filter(Boolean).join(", "))}</span><br><b>${esc(n.title)}</b><details><summary>${esc(L("Matnni ko‘rish", "Показать текст"))}</summary><p class="pre">${esc(n.text)}</p></details>
      ${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">lex.uz ↗<span class="sr"> — ${esc(n.title)}</span></a>` : ""}</div></li>`).join("")}</ul>` : none();
  }
  function terms(){
    return D.scenarios.filter(hit).map(s => `<article class="card pterm" aria-labelledby="ps_${s.id}"><h2 id="ps_${s.id}">${esc(s.title)}</h2>
      <p>${s.none ? "" : `<span class="chip">${esc(s.term)}</span>`} ${s.note ? `<span class="small muted">${esc(s.note)}</span>` : ""}</p>
      ${s.none ? "" : `<div class="pcalc"><div class="field"><label for="pd_${s.id}">${esc(s.trigger)}</label><input id="pd_${s.id}" type="date" max="${iso()}" data-pcalc="${s.id}" value="${esc(calc[s.id]?.trigger || "")}"></div><output id="po_${s.id}" for="pd_${s.id}">${calcOut(s.id)}</output></div>`}
      <details><summary>${esc(L("Hujjatlar va dalillar", "Документы и доказательства"))}</summary><p class="small"><b>${esc(L("Hujjatlar", "Документы"))}:</b> ${s.docs.map(esc).join(" · ")}</p><ul class="small">${s.evidence.map(e => `<li>${esc(e)}</li>`).join("")}</ul></details>
      <div class="rowbtn"><button class="btn primary sm" type="button" data-pact="case" data-scn="${s.id}" data-id="${s.areas[0]}">${esc(L("Ish ochish", "Открыть дело"))}<span class="sr">: ${esc(s.title)}</span></button>
        <a class="btn ghost sm" href="/?holat=${s.id}">${esc(L("Ariza tayyorlash", "Подготовить заявление"))}<span class="sr">: ${esc(s.title)}</span></a></div></article>`).join("") || none();
  }
  const calcOut = id => { const c = calc[id]; return !c ? "" : c.error ? `<span class="err">${esc(c.error)}</span>` : c.deadline ? `<b>${esc(c.text)}</b> <span class="chip ${c.days < 0 ? "bad" : c.days <= 7 ? "warn" : "ok"}">${esc(c.days < 0 ? L(`${-c.days} kun o‘tdi`, `просрочено на ${-c.days} дн.`) : L(`${c.days} kun qoldi`, `осталось ${c.days} дн.`))}</span>` : ""; };
  async function runCalc(id, trigger){
    calc[id] = { trigger };
    try {
      const r = await fetch("/api/plan", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ scenario:id, triggerDate:trigger, form:{}, lang:LANG }) });
      const p = await r.json(); if (!r.ok) throw new Error(p.error);
      calc[id] = { trigger, deadline:p.deadline, text:p.deadlineText, days:p.daysLeft };
    } catch (x){ calc[id] = { trigger, error: x.message || L("Hisoblanmadi.", "Не удалось рассчитать.") }; }
    const o = $(`po_${id}`); if (o) o.innerHTML = calcOut(id);
  }
  function offices(){
    return `<ul class="klist">${D.offices.filter(hit).map(o => `<li><div><b>${esc(o.name)}</b><br><span class="muted">${esc(o.role)}</span>${o.address ? `<br>${esc(o.address)}` : ""}${o.hours ? `<br><span class="small muted">${esc(o.hours)}</span>` : ""}
      <p class="rowbtn">${o.phones.map(p => `<a href="tel:${esc(p.tel)}">${esc(p.text)}<span class="sr"> — ${esc(p.label)}</span></a>`).join("")}${o.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a>`).join("")}</p></div></li>`).join("")}</ul>`;
  }
  const check = () => scope().map(a => `<section class="card pterm" aria-labelledby="pc_${a}"><h2 id="pc_${a}">${esc(areaTitle(a))}</h2><ol>${D.checklists[a].map(t => `<li>${esc(t)}</li>`).join("")}</ol>
      <div class="rowbtn"><button class="btn primary sm" type="button" data-pact="case" data-id="${a}">${esc(L("Shu ro‘yxat bilan ish ochish", "Открыть дело с этим списком"))}<span class="sr">: ${esc(areaTitle(a))}</span></button></div></section>`).join("");

  // ---------- Amallar ----------
  const panel = () => $("panel");
  const redraw = focus => { if (location.hash.slice(1) !== "yonalish") return; panel().innerHTML = html(); if (focus) panel().querySelector(focus)?.focus(); };
  const rebody = focus => { $("pbody").innerHTML = body(); if (focus) panel().querySelector(focus)?.focus(); };
  let areaT = null;
  function storeAreas(){
    S().areas = [...mine]; save();
    if (D.mine === null) return;                                      // tashkilot: faqat kabinet ma’lumotida
    clearTimeout(areaT);
    areaT = setTimeout(() => fetch("/api/lawyer/areas", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ areas: mine }), credentials:"same-origin" })
      .then(r => { if (!r.ok) throw 0; say(L("Yo‘nalishlar saqlandi", "Направления сохранены")); }).catch(() => say(L("Yo‘nalishlar saqlanmadi — internetni tekshiring", "Направления не сохранены — проверьте интернет"))), 500);
  }
  async function click(e){
    const b = e.target.closest("[data-pact]"); if (!b) return false;
    const a = b.dataset.pact, id = b.dataset.id, again = `[data-pact="${a}"][data-id="${id}"]`;
    if (a === "retry"){ failed = ""; loading = null; go("yonalish"); }
    else if (a === "area"){
      if (mine.includes(id)) mine = mine.filter(x => x !== id);
      else if (mine.length >= 10){ say(L("Eng ko‘pi 10 ta yo‘nalish", "Не более 10 направлений")); return true; }
      else mine = [...mine, id];
      if (!mine.includes(view)) view = "";
      tpl = null; type = "";
      const open = !!panel().querySelector(".pedit[open]") || mine.length === 1; storeAreas(); redraw();
      const d = panel().querySelector(".pedit"); if (d && open) d.open = true;
      panel().querySelector(again)?.focus();
      say(`${areaTitle(id)}: ${mine.includes(id) ? L("qo‘shildi", "добавлено") : L("olib tashlandi", "убрано")}`);
    }
    else if (a === "view"){ view = id; tpl = null; type = ""; redraw(again); }
    else if (a === "sec"){ sec = id; q = ""; tpl = null; redraw(again); }
    else if (a === "type"){ type = id; rebody(again); }
    else if (a === "saved"){ onlySaved = !onlySaved; rebody(`[data-pact="saved"]`); }
    else if (a === "star"){ const sv = saved(); sv.has(id) ? sv.delete(id) : sv.add(id); S().saved = [...sv].slice(-300); save(); rebody(again); }
    else if (a === "lib"){ const x = D.acts.find(v => v.id === id); S().org.docs.unshift({ id: Math.random().toString(36).slice(2, 10), type:"qonun", title:x.title, number:[x.num, x.date && showDate(x.date)].filter(Boolean).join(", "), url:x.url, text:"" }); save(); rebody(`[data-pact="star"][data-id="${id}"]`); say(L("Kutubxonaga qo‘shildi", "Добавлено в библиотеку")); }
    else if (a === "fill"){ tpl = D.templates.find(t => t.id === id); vals = {}; autofill(); rebody("#pfH"); }
    else if (a === "back"){ tpl = null; rebody(`#p_q`); }
    else if (a === "copy"){
      const t = { id: Math.random().toString(36).slice(2, 10), title: cy(tpl.title), text: cy([...tpl.to.map(fillText), "", fillText(tpl.text)].join("\n").trim()) };
      S().templates.unshift(t); save(); say(L("«Shablonlar» bo‘limiga nusxalandi", "Скопировано в раздел «Шаблоны»"));
    }
    else if (a === "dl"){
      const er = $("p_err"); er.hidden = true; b.disabled = true;
      try { await customDoc(tpl.title, fillText(tpl.text), b.dataset.fmt, { to: tpl.to.map(fillText), sign: !ownSign() }); }
      catch (x){ er.textContent = x.message; er.hidden = false; } finally { b.disabled = false; }
    }
    else if (a === "case"){
      const s = D.scenarios.find(x => x.id === b.dataset.scn), c = s && calc[s.id], uid = () => Math.random().toString(36).slice(2, 10);
      S().cases.unshift({ id: uid(), title: s ? s.title : `${areaTitle(id)} — ${L("yangi ish", "новое дело")}`, clientId:"", scenario: s?.id || "", area:id, court:"", number:"", stage:"prep",
        deadlines: c?.deadline ? [{ id: uid(), date:c.deadline, note:s.title, done:false }] : [], tasks: D.checklists[id].map(t => ({ id: uid(), text:t, done:false })) });
      save(); go("ishlar", true); say(L("Ish ochildi", "Дело открыто"));
    }
    return true;
  }
  function input(e){
    if (e.target.id === "p_q"){ q = e.target.value; $("plist").innerHTML = sec === "acts" ? actList() : sec === "tpl" ? tplList() : normList(); return true; }
    if (e.target.dataset.pf){ vals[e.target.dataset.pf] = e.target.value; $("ppaper").innerHTML = paper(); return true; }
    return false;
  }
  function change(e){
    if (e.target.id === "p_client" || e.target.id === "p_case"){
      const isC = e.target.id === "p_client";
      if (isC) pickClient = e.target.value;
      else { pickCase = e.target.value; const k = S().cases.find(x => x.id === pickCase); if (k?.clientId) pickClient = k.clientId; }
      for (const f of tpl.fields) if (new RegExp(`^(client|case)\\.`).test(D.fields[f].src)) vals[f] = "";      // tanlov almashsa, avtomatik maydonlar yangilanadi
      autofill(); rebody("#" + e.target.id); return true;
    }
    if (e.target.dataset.pcalc){ if (e.target.value) runCalc(e.target.dataset.pcalc, e.target.value); return true; }
    return false;
  }
  return { view: html, click, input, change,
    submit: e => e.target.id === "pform",
    after(){ if (!D && !failed) (loading ||= load()).then(() => redraw()); } };
}
