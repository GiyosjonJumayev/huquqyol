// Yurist Pro kabineti: mijozlar va ishlar kartotekasi, muddatlar kalendari, o‘z blankasi va shablonlari,
// tashkilot hujjatlari kutubxonasi, katalogdagi profil. Ma’lumotlar faqat shu brauzerda (localStorage) saqlanadi —
// serverga faqat foydalanuvchi o‘zi bosganda yuboriladi: hujjat yuklab olish (saqlanmaydi) va katalogga ariza.
import { esc } from "/shared.js";
import { toCyrillic as toCyr } from "/translit.js";
import { normLang, fmtDate } from "/i18n.js";

const root = document.getElementById("kab");
const LANG = normLang(root.dataset.lang), RU = LANG === "ru";
const L = (uz, ru) => RU ? ru : LANG === "cyr" ? toCyr(uz) : uz;
const KEY = "huquqyol:pro";
const iso = (d = new Date()) => { const z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
const uid = () => Math.random().toString(36).slice(2, 10);
const dt = s => s ? fmtDate(new Date(s + "T00:00:00"), RU ? "ru" : "uz") : "";
const showDate = s => LANG === "cyr" ? toCyr(dt(s)) : dt(s);

const EMPTY = () => ({ v:1, plan:"pro", since: iso(), clients:[], cases:[], letterhead:{ on:false, lines:["", "", "", ""] }, templates:[], org:{ name:"", docs:[] }, profile:{} });
function load(){ try { return { ...EMPTY(), ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return EMPTY(); } }
let S = load();
// Saqlash: brauzerda (darhol) va hisobda (1,5 soniyadan keyin) — boshqa qurilmada ham ochiladi
const SYNC = root.dataset.sync === "1";
let syncT = null, syncState = "";
function setSync(st){ syncState = st; const el = document.getElementById("syncState"); if (el) el.textContent = SYNC_TEXT[st] ? L(...SYNC_TEXT[st]) : ""; }
const SYNC_TEXT = { saving:["Saqlanmoqda…", "Сохранение…"], saved:["✓ Hisobingizda saqlandi", "✓ Сохранено в аккаунте"], error:["Hisobga saqlanmadi — internetni tekshiring (ma’lumot brauzerda bor)", "Не сохранено в аккаунте — проверьте интернет (данные есть в браузере)"] };
async function pushServer(){
  try {
    setSync("saving");
    const r = await fetch("/api/cabinet", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ data: S }), credentials:"same-origin" });
    if (!r.ok) throw 0;
    S.syncedAt = (await r.json()).updatedAt; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
    setSync("saved");
  } catch { setSync("error"); }
}
const save = () => {
  S.savedAt = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
  if (SYNC){ clearTimeout(syncT); syncT = setTimeout(pushServer, 1500); }
};
if (new URLSearchParams(location.search).get("tarif") in { pro:1, firma:1, org:1 }){ S.plan = new URLSearchParams(location.search).get("tarif"); save(); }

// Ma’lumotlar: holatlar va qonunlar (meta), hududlar (sudlar bazasi)
let META = null, COURTS = null;
const getMeta = () => fetch("/api/meta").then(r => r.json()).then(m => (META = m)).catch(() => null);
const getCourts = () => fetch("/api/courts").then(r => r.json()).then(c => (COURTS = c)).catch(() => null);
const EXTRA_AREAS = [["jinoyat", "Jinoyat ishlari", "Уголовные дела"], ["soliq", "Soliq", "Налоги"], ["biznes", "Biznes va korporativ", "Бизнес и корпоративное право"],
  ["shartnoma", "Shartnomalar", "Договоры"], ["meros", "Meros", "Наследство"], ["yer", "Yer va ko‘chmas mulk", "Земля и недвижимость"]];

const TABS = [
  ["umumiy", "Umumiy", "Обзор"], ["mijozlar", "Mijozlar", "Клиенты"], ["ishlar", "Ishlar", "Дела"], ["kalendar", "Kalendar", "Календарь"],
  ["blanka", "Blanka", "Бланк"], ["shablonlar", "Shablonlar", "Шаблоны"], ["tashkilot", "Tashkilot hujjatlari", "Документы организации"], ["profil", "Katalog profili", "Профиль в каталоге"]
];
const PLAN_NAMES = { pro:["Yurist Pro", "Юрист Pro"], firma:["Firma", "Фирма"], org:["Tashkilot", "Организация"] };
const STAGES = [["prep", "Tayyorgarlik", "Подготовка"], ["pre", "Sudgacha", "Досудебная стадия"], ["court", "Sudda", "В суде"], ["exec", "Ijroda", "Исполнение"], ["closed", "Yopilgan", "Закрыто"]];
const DOC_TYPES = [["nizom", "Nizom (ustav)", "Устав (положение)"], ["qoida", "Ichki qoida", "Внутреннее правило"], ["buyruq", "Buyruq", "Приказ"],
  ["yoriqnoma", "Lavozim yo‘riqnomasi", "Должностная инструкция"], ["shablon", "Ichki shablon", "Внутренний шаблон"], ["qonun", "Qonun yoki normativ hujjat", "Закон или нормативный акт"]];
const opt = (list, cur) => list.map(([v, uz, ru]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(L(uz, ru))}</option>`).join("");
const name = (list, v) => { const x = list.find(i => i[0] === v); return x ? L(x[1], x[2]) : ""; };

// ---------- Qobiq ----------
let tab = TABS.some(t => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : "umumiy";
root.innerHTML = `<h1>${esc(L("Yurist kabineti", "Кабинет юриста"))} <span class="tag pro" id="planTag"></span></h1>
  <p class="note">${esc(L("Ma’lumotlar hisobingizda saqlanadi va boshqa qurilmalarda ham ochiladi. Zaxira nusxa — «Umumiy» bo‘limida.", "Данные хранятся в вашем аккаунте и открываются на других устройствах. Резервная копия — в разделе «Обзор»."))} <span class="syncstate" id="syncState" aria-live="polite"></span></p>
  <nav class="kabtabs" role="tablist" aria-label="${esc(L("Kabinet bo‘limlari", "Разделы кабинета"))}">${TABS.map(([id, uz, ru]) => `<a role="tab" href="#${id}" data-tab="${id}">${esc(L(uz, ru))}</a>`).join("")}</nav>
  <section id="panel" class="kabpanel" role="tabpanel" tabindex="-1"></section><div class="sr" aria-live="polite" id="kabLive"></div>`;
const panel = document.getElementById("panel");
const say = m => { const l = document.getElementById("kabLive"); l.textContent = ""; setTimeout(() => { l.textContent = m; }, 30); };
function go(id, focus){
  tab = id;
  if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
  document.querySelectorAll(".kabtabs a").forEach(a => a.setAttribute("aria-selected", String(a.dataset.tab === id)));
  document.getElementById("planTag").textContent = L(...PLAN_NAMES[S.plan] || PLAN_NAMES.pro);
  panel.innerHTML = (VIEWS[id] || VIEWS.umumiy)();
  AFTER[id]?.();
  if (focus) panel.focus();
}
window.addEventListener("hashchange", () => { const id = location.hash.slice(1); if (TABS.some(t => t[0] === id) && id !== tab) go(id, true); });

// ---------- Yordamchilar ----------
const deadlines = () => S.cases.flatMap(c => (c.deadlines || []).map(d => ({ ...d, case: c }))).sort((a, b) => a.date.localeCompare(b.date));
const daysTo = s => Math.round((new Date(s + "T00:00:00") - new Date(iso() + "T00:00:00")) / 864e5);
const clientName = id => S.clients.find(c => c.id === id)?.name || "";
const scnTitle = id => META?.scenarios.find(s => s.id === id)?.title || "";
function download(blob, file){ const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
const letterhead = () => S.letterhead.on ? S.letterhead.lines.map(s => s.trim()).filter(Boolean) : [];
async function customDoc(title, text, fmt){
  const r = await fetch(`/api/custom/${fmt}`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ title, text, letterhead: letterhead(), lang: LANG }) });
  if (!r.ok){ let m = L("Nimadir ishlamadi. Qayta urinib ko‘ring.", "Что-то пошло не так. Попробуйте ещё раз."); try { m = (await r.json()).error || m; } catch {} throw new Error(m); }
  download(await r.blob(), `${(title || "hujjat").replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60)}.${fmt}`);
}
const field = (id, label, input, hint = "") => `<div class="field"><label for="${id}">${esc(label)}</label>${input}${hint ? `<span class="hint">${esc(hint)}</span>` : ""}</div>`;
const inp = (id, v = "", attrs = "") => `<input id="${id}" value="${esc(v)}" ${attrs}>`;
const empty = t => `<p class="empty">${esc(t)}</p>`;

// ---------- Bo‘limlar ----------
const VIEWS = {
  umumiy(){
    const dl = deadlines().filter(d => !d.done), over = dl.filter(d => daysTo(d.date) < 0).length, week = dl.filter(d => daysTo(d.date) >= 0 && daysTo(d.date) <= 7).length;
    return `<div class="kabstats">
        <div class="stattile"><div class="stv">${S.clients.length}</div><div class="stl">${esc(L("Mijozlar", "Клиенты"))}</div></div>
        <div class="stattile"><div class="stv">${S.cases.filter(c => c.stage !== "closed").length}</div><div class="stl">${esc(L("Faol ishlar", "Активные дела"))}</div></div>
        <div class="stattile${week ? " warnt" : ""}"><div class="stv">${week}</div><div class="stl">${esc(L("7 kun ichidagi muddatlar", "Сроки в ближайшие 7 дней"))}</div></div>
        <div class="stattile${over ? " badt" : ""}"><div class="stv">${over}</div><div class="stl">${esc(L("O‘tib ketgan muddatlar", "Просроченные сроки"))}</div></div></div>
      <h2 class="sec">${esc(L("Tarif", "Тариф"))}</h2>
      <fieldset class="plansel"><legend class="sr">${esc(L("Tarif", "Тариф"))}</legend>${Object.entries(PLAN_NAMES).map(([id, n]) => `<label><input type="radio" name="plan" value="${id}"${S.plan === id ? " checked" : ""}> ${esc(L(...n))}</label>`).join("")}</fieldset>
      <p class="small muted">${esc(L("To‘lov keyingi bosqichda ulanadi. Tariflarni solishtirish:", "Оплата подключится на следующем этапе. Сравнить тарифы:"))} <a href="/tariflar">${esc(L("Tariflar", "Тарифы"))}</a></p>
      <h2 class="sec">${esc(L("Zaxira nusxa", "Резервная копия"))}</h2>
      <p>${esc(L("Ma’lumotlar serverga yuborilmaydi va faqat shu brauzerda turadi. Boshqa qurilmaga o‘tkazish yoki yo‘qotmaslik uchun faylga saqlang.", "Данные не отправляются на сервер и хранятся только в этом браузере. Сохраните их в файл, чтобы перенести на другое устройство или не потерять."))}</p>
      <div class="rowbtn"><button class="btn primary" type="button" data-act="export">${esc(L("Faylga saqlash (JSON)", "Сохранить в файл (JSON)"))}</button>
        <label class="btn ghost filebtn">${esc(L("Fayldan tiklash", "Восстановить из файла"))}<input type="file" accept="application/json,.json" id="importFile" class="sr"></label></div>`;
  },
  mijozlar(){
    return `<form class="card kform" data-form="client"><h2>${esc(L("Yangi mijoz", "Новый клиент"))}</h2>
        ${field("c_name", L("F.I.Sh. yoki tashkilot nomi", "ФИО или название организации"), inp("c_name", "", 'required maxlength="160" autocomplete="off"'))}
        ${field("c_phone", L("Telefon", "Телефон"), inp("c_phone", "", 'type="tel" maxlength="40" autocomplete="off"'))}
        ${field("c_note", L("Izoh", "Заметка"), `<textarea id="c_note" maxlength="1000"></textarea>`)}
        <button class="btn primary" type="submit">${esc(L("Qo‘shish", "Добавить"))}</button></form>
      <h2 class="sec">${esc(L("Mijozlar", "Клиенты"))} (${S.clients.length})</h2>
      ${S.clients.length ? `<ul class="klist">${S.clients.map(c => { const n = S.cases.filter(x => x.clientId === c.id).length;
        return `<li><div><b>${esc(c.name)}</b>${c.phone ? ` · <span class="mono">${esc(c.phone)}</span>` : ""}<br><span class="muted">${esc(c.note || "")}</span></div>
          <div class="rowbtn"><span class="small muted">${esc(L(`${n} ta ish`, `дел: ${n}`))}</span><button class="linkbtn" type="button" data-act="delClient" data-id="${c.id}">${esc(L("O‘chirish", "Удалить"))}</button></div></li>`; }).join("")}</ul>`
        : empty(L("Hali mijoz yo‘q.", "Клиентов пока нет."))}`;
  },
  ishlar(){
    const scen = META ? META.scenarios.map(s => [s.id, s.title, s.title]) : [];
    return `<form class="card kform" data-form="case"><h2>${esc(L("Yangi ish", "Новое дело"))}</h2>
        ${field("k_title", L("Ish nomi", "Название дела"), inp("k_title", "", 'required maxlength="200" autocomplete="off"'), L("Masalan: Karimov — ish haqini undirish", "Например: Каримов — взыскание зарплаты"))}
        <div class="grid2">
        ${field("k_client", L("Mijoz", "Клиент"), `<select id="k_client"><option value="">—</option>${S.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select>`)}
        ${field("k_scn", L("Holat turi (HuquqYo‘l)", "Тип ситуации (HuquqYo‘l)"), `<select id="k_scn"><option value="">—</option>${scen.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("")}</select>`)}
        ${field("k_court", L("Sud yoki organ", "Суд или орган"), inp("k_court", "", 'maxlength="200" autocomplete="off"'))}
        ${field("k_num", L("Ish raqami", "Номер дела"), inp("k_num", "", 'maxlength="60" autocomplete="off"'))}
        ${field("k_stage", L("Bosqich", "Стадия"), `<select id="k_stage">${opt(STAGES, "prep")}</select>`)}
        ${field("k_dl", L("Birinchi muddat", "Первый срок"), inp("k_dl", "", 'type="date"'))}
        </div>
        ${field("k_dlnote", L("Muddat nimaga", "Что за срок"), inp("k_dlnote", "", 'maxlength="160" autocomplete="off"'), L("Masalan: sudga da’vo berish", "Например: подать иск в суд"))}
        <button class="btn primary" type="submit">${esc(L("Ish qo‘shish", "Добавить дело"))}</button></form>
      <h2 class="sec">${esc(L("Ishlar", "Дела"))} (${S.cases.length})</h2>
      ${S.cases.length ? S.cases.map(c => `<article class="card kcase" aria-labelledby="h_${c.id}">
        <div class="kchead"><h3 id="h_${c.id}">${esc(c.title)}</h3><select data-act="stage" data-id="${c.id}" aria-label="${esc(L("Bosqich", "Стадия"))}">${opt(STAGES, c.stage)}</select></div>
        <p class="muted">${[clientName(c.clientId), scnTitle(c.scenario), c.court, c.number && `№ ${c.number}`].filter(Boolean).map(esc).join(" · ")}</p>
        <ul class="kdl">${(c.deadlines || []).map(d => `<li class="${d.done ? "done" : daysTo(d.date) < 0 ? "over" : daysTo(d.date) <= 7 ? "soon" : ""}">
          <label><input type="checkbox" data-act="dlDone" data-case="${c.id}" data-id="${d.id}"${d.done ? " checked" : ""}> <b>${esc(showDate(d.date))}</b> — ${esc(d.note || "")}</label>
          <button class="linkbtn" type="button" data-act="delDl" data-case="${c.id}" data-id="${d.id}">${esc(L("O‘chirish", "Удалить"))}</button></li>`).join("")}</ul>
        <form class="inline" data-form="dl" data-case="${c.id}"><input type="date" required aria-label="${esc(L("Muddat sanasi", "Дата срока"))}" name="date">
          <input name="note" maxlength="160" placeholder="${esc(L("Muddat nimaga", "Что за срок"))}" aria-label="${esc(L("Muddat nimaga", "Что за срок"))}">
          <button class="btn ghost" type="submit">${esc(L("Muddat qo‘shish", "Добавить срок"))}</button></form>
        <p class="rowbtn"><button class="linkbtn" type="button" data-act="delCase" data-id="${c.id}">${esc(L("Ishni o‘chirish", "Удалить дело"))}</button></p>
      </article>`).join("") : empty(L("Hali ish yo‘q. HuquqYo‘lda reja tuzganingizda muddatni shu yerga qo‘shing.", "Дел пока нет. Добавьте сроки из плана HuquqYo‘l сюда."))}`;
  },
  kalendar(){
    const dl = deadlines().filter(d => !d.done);
    const groups = new Map();
    for (const d of dl){ const k = d.date.slice(0, 7); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(d); }
    const month = k => { const s = fmtDate(new Date(k + "-01T00:00:00"), RU ? "ru" : "uz").replace(/^\d+[-\s]?/, ""); return LANG === "cyr" ? toCyr(s) : s; };
    return `<p>${esc(L("Barcha ishlar bo‘yicha bajarilmagan muddatlar. Telefoningiz kalendariga qo‘shish uchun .ics faylni yuklab oling.", "Все невыполненные сроки по делам. Скачайте .ics, чтобы добавить их в календарь телефона."))}</p>
      <p><button class="btn primary" type="button" data-act="ics"${dl.length ? "" : " disabled"}>${esc(L("Kalendarga eksport (.ics)", "Экспорт в календарь (.ics)"))}</button></p>
      ${dl.length ? [...groups].map(([k, list]) => `<h2 class="sec">${esc(month(k))}</h2><ul class="kcal">${list.map(d => { const n = daysTo(d.date);
        const badge = n < 0 ? L(`${-n} kun o‘tdi`, `просрочено на ${-n} дн.`) : n === 0 ? L("Bugun", "Сегодня") : L(`${n} kun qoldi`, `осталось ${n} дн.`);
        return `<li class="${n < 0 ? "over" : n <= 7 ? "soon" : ""}"><span class="kd">${esc(showDate(d.date))}</span><span><b>${esc(d.note || "")}</b><br><span class="muted">${esc(d.case.title)}${d.case.clientId ? " · " + esc(clientName(d.case.clientId)) : ""}</span></span><span class="kb">${esc(badge)}</span></li>`; }).join("")}</ul>`).join("")
        : empty(L("Muddat yo‘q. «Ishlar» bo‘limida ishga muddat qo‘shing.", "Сроков нет. Добавьте срок к делу в разделе «Дела»."))}`;
  },
  blanka(){
    const lh = S.letterhead, ph = [L("Advokatlik byurosi yoki F.I.Sh.", "Адвокатское бюро или ФИО"), L("Manzil", "Адрес"), L("Telefon, e-pochta", "Телефон, эл. почта"), L("Litsenziya raqami, STIR", "Номер лицензии, ИНН")];
    return `<form class="card kform" data-form="letterhead"><h2>${esc(L("O‘z blankangiz", "Ваш бланк"))}</h2>
        <p class="muted">${esc(L("Blanka yoqilganda HuquqYo‘lda tayyorlangan barcha arizalar va o‘z shablonlaringiz shu rekvizitlar bilan chiqadi (PDF va DOCX).", "Когда бланк включён, все заявления HuquqYo‘l и ваши шаблоны выходят с этими реквизитами (PDF и DOCX)."))}</p>
        <label class="check"><input type="checkbox" id="lh_on"${lh.on ? " checked" : ""}> ${esc(L("Blankani barcha hujjatlarda ishlatish", "Использовать бланк во всех документах"))}</label>
        ${lh.lines.map((v, i) => field(`lh_${i}`, `${i + 1}-${L("qator", "строка")}`, inp(`lh_${i}`, v, `maxlength="120" placeholder="${esc(ph[i])}" autocomplete="off"`))).join("")}
        <button class="btn primary" type="submit">${esc(L("Saqlash", "Сохранить"))}</button></form>
      <h2 class="sec">${esc(L("Ko‘rinishi", "Предпросмотр"))}</h2>
      <div class="paper lhprev">${lh.lines.filter(s => s.trim()).map((s, i) => `<div class="${i ? "" : "b"}">${esc(s)}</div>`).join("") || `<div class="muted">${esc(L("Qatorlarni to‘ldiring", "Заполните строки"))}</div>`}</div>`;
  },
  shablonlar(){
    const cur = S.templates.find(t => t.id === editing) || { id:"", title:"", text:"" };
    return `<form class="card kform" data-form="tpl"><h2>${esc(cur.id ? L("Shablonni tahrirlash", "Редактирование шаблона") : L("Yangi shablon", "Новый шаблон"))}</h2>
        ${field("t_title", L("Hujjat sarlavhasi", "Заголовок документа"), inp("t_title", cur.title, 'maxlength="120" autocomplete="off"'), L("Masalan: ADVOKAT SO‘ROVI", "Например: АДВОКАТСКИЙ ЗАПРОС"))}
        ${field("t_text", L("Matn", "Текст"), `<textarea id="t_text" rows="14" maxlength="20000" required>${esc(cur.text)}</textarea>`, L("Bo‘sh qator — yangi xatboshi. [F.I.Sh.] kabi joylarni yuklab olishdan oldin to‘ldiring.", "Пустая строка — новый абзац. Места вроде [ФИО] заполните перед скачиванием."))}
        <div class="rowbtn"><button class="btn primary" type="submit">${esc(L("Saqlash", "Сохранить"))}</button>
          <button class="btn ghost" type="button" data-act="tplDl" data-fmt="docx">DOCX</button><button class="btn ghost" type="button" data-act="tplDl" data-fmt="pdf">PDF</button>
          ${cur.id ? `<button class="linkbtn" type="button" data-act="tplNew">${esc(L("Yangi shablon", "Новый шаблон"))}</button>` : ""}</div>
        <p class="small muted">${esc(L(S.letterhead.on ? "Blanka yoqilgan: hujjat rekvizitlaringiz bilan chiqadi." : "Blanka o‘chiq — «Blanka» bo‘limida yoqing.", S.letterhead.on ? "Бланк включён: документ выйдет с вашими реквизитами." : "Бланк выключен — включите в разделе «Бланк»."))}</p></form>
      <h2 class="sec">${esc(L("Shablonlarim", "Мои шаблоны"))} (${S.templates.length})</h2>
      ${S.templates.length ? `<ul class="klist">${S.templates.map(t => `<li><div><b>${esc(t.title || L("Sarlavhasiz", "Без заголовка"))}</b><br><span class="muted">${esc(t.text.slice(0, 120))}…</span></div>
        <div class="rowbtn"><button class="linkbtn" type="button" data-act="tplEdit" data-id="${t.id}">${esc(L("Tahrirlash", "Изменить"))}</button><button class="linkbtn" type="button" data-act="tplDel" data-id="${t.id}">${esc(L("O‘chirish", "Удалить"))}</button></div></li>`).join("")}</ul>`
        : empty(L("Hali shablon yo‘q. HuquqYo‘lda tayyorlangan ariza matnini («Matnni nusxalash») shu yerga qo‘yib, o‘zingizga moslang.", "Шаблонов пока нет. Вставьте сюда текст заявления из HuquqYo‘l («Скопировать текст») и доработайте под себя."))}`;
  },
  tashkilot(){
    const q = (orgFilter.q || "").toLowerCase(), type = orgFilter.type || "";
    const docs = S.org.docs.filter(d => (!type || d.type === type) && (!q || `${d.title} ${d.number} ${d.text}`.toLowerCase().includes(q)));
    const laws = META ? Object.entries(META.laws).filter(([, l]) => l.url) : [];
    return `<p>${esc(L("Tashkilot yuristi uchun: ustav, ichki qoidalar, buyruqlar, ichki shablonlar va faoliyatga oid qonunlar bitta joyda. Matnli hujjatni bir tugma bilan shablonga aylantirib, tashkilot blankasida yuklab olish mumkin.", "Для юриста организации: устав, внутренние правила, приказы, шаблоны и законы по деятельности в одном месте. Текстовый документ можно одной кнопкой превратить в шаблон и скачать на бланке организации."))}</p>
      <form class="card kform" data-form="org"><h2>${esc(L("Hujjat qo‘shish", "Добавить документ"))}</h2>
        ${field("o_name", L("Tashkilot nomi", "Название организации"), inp("o_name", S.org.name, 'maxlength="200" autocomplete="organization"'))}
        <div class="grid2">${field("d_type", L("Turi", "Тип"), `<select id="d_type">${opt(DOC_TYPES, "nizom")}</select>`)}
        ${field("d_title", L("Nomi", "Название"), inp("d_title", "", 'maxlength="200" autocomplete="off"'))}
        ${field("d_num", L("Raqami va sanasi", "Номер и дата"), inp("d_num", "", 'maxlength="80" autocomplete="off"'), L("Masalan: 12-son, 01.03.2026", "Например: № 12 от 01.03.2026"))}
        ${field("d_url", L("Havola (lex.uz yoki ichki tizim)", "Ссылка (lex.uz или внутренняя система)"), inp("d_url", "", 'type="url" maxlength="300" placeholder="https://"'))}</div>
        ${field("d_text", L("Matn yoki qisqa mazmuni", "Текст или краткое содержание"), `<textarea id="d_text" rows="6" maxlength="20000"></textarea>`)}
        <button class="btn primary" type="submit">${esc(L("Kutubxonaga qo‘shish", "Добавить в библиотеку"))}</button></form>
      <h2 class="sec">${esc(L("Kutubxona", "Библиотека"))} (${S.org.docs.length})</h2>
      <div class="kfilter"><input id="o_q" type="search" value="${esc(orgFilter.q || "")}" placeholder="${esc(L("Qidirish…", "Поиск…"))}" aria-label="${esc(L("Kutubxonadan qidirish", "Поиск по библиотеке"))}">
        <select id="o_type" aria-label="${esc(L("Turi bo‘yicha", "По типу"))}"><option value="">${esc(L("Barcha turlar", "Все типы"))}</option>${opt(DOC_TYPES, type)}</select></div>
      ${docs.length ? `<ul class="klist">${docs.map(d => `<li><div><span class="tag">${esc(name(DOC_TYPES, d.type))}</span> <b>${esc(d.title)}</b>${d.number ? ` · ${esc(d.number)}` : ""}
          ${d.url ? `<br><a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">${esc(d.url.replace(/^https?:\/\//, "").slice(0, 60))} ↗</a>` : ""}
          ${d.text ? `<details><summary>${esc(L("Matn", "Текст"))}</summary><p class="pre">${esc(d.text)}</p></details>` : ""}</div>
        <div class="rowbtn">${d.text ? `<button class="linkbtn" type="button" data-act="toTpl" data-id="${d.id}">${esc(L("Shablonga aylantirish", "Сделать шаблоном"))}</button>` : ""}<button class="linkbtn" type="button" data-act="delDoc" data-id="${d.id}">${esc(L("O‘chirish", "Удалить"))}</button></div></li>`).join("")}</ul>`
        : empty(S.org.docs.length ? L("Qidiruv bo‘yicha hech narsa topilmadi.", "По запросу ничего не найдено.") : L("Kutubxona bo‘sh. Ustav, ichki qoidalar va buyruqlarni qo‘shing.", "Библиотека пуста. Добавьте устав, внутренние правила и приказы."))}
      ${laws.length ? `<h2 class="sec">${esc(L("Qonunlar bazasidan qo‘shish", "Добавить из базы законов"))}</h2><ul class="klist">${laws.map(([k, l]) => `<li><div><b>${esc(l.name)}</b><br><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.url.replace(/^https:\/\//, ""))} ↗</a></div>
        <div class="rowbtn">${S.org.docs.some(d => d.url === l.url) ? `<span class="small muted">✓ ${esc(L("Qo‘shilgan", "Добавлено"))}</span>` : `<button class="linkbtn" type="button" data-act="addLaw" data-k="${esc(k)}">${esc(L("Qo‘shish", "Добавить"))}</button>`}</div></li>`).join("")}</ul>` : ""}`;
  },
  profil(){
    return `<section class="card"><h2>${esc(L("Katalogdagi profilingiz", "Ваш профиль в каталоге"))}</h2>
      <p>${esc(L("Rasm, tajriba, ta’lim, xizmatlar va narxlar, aloqa ma’lumotlari — profil sahifasida. Litsenziya tekshirilgach va Yurist Pro faol bo‘lsa, profil katalogda fuqarolarga ko‘rinadi.", "Фото, опыт, образование, услуги и цены, контакты — на странице профиля. После проверки лицензии и при активном «Юрист Pro» профиль виден гражданам в каталоге."))}</p>
      <p class="rowbtn"><a class="btn primary" href="/hisob/profil">${esc(L("Profilni tahrirlash", "Редактировать профиль"))}</a><a class="btn ghost" href="/hisob/statistika">${esc(L("Statistika", "Статистика"))}</a></p></section>`;
  }
};
let editing = "", orgFilter = {};
const AFTER = {
  tashkilot(){
    const f = () => { orgFilter = { q: document.getElementById("o_q").value, type: document.getElementById("o_type").value }; const pos = document.getElementById("o_q").selectionStart; go("tashkilot"); const q = document.getElementById("o_q"); q.focus(); q.setSelectionRange(pos, pos); };
    document.getElementById("o_q").addEventListener("input", f);
    document.getElementById("o_type").addEventListener("change", f);
  }
};

// ---------- Hodisalar ----------
const val = id => document.getElementById(id)?.value.trim() ?? "";
panel.addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target.dataset.form;
  if (f === "client"){ if (!val("c_name")) return; S.clients.push({ id: uid(), name: val("c_name"), phone: val("c_phone"), note: val("c_note") }); say(L("Mijoz qo‘shildi", "Клиент добавлен")); }
  else if (f === "case"){
    if (!val("k_title")) return;
    const c = { id: uid(), title: val("k_title"), clientId: val("k_client"), scenario: val("k_scn"), court: val("k_court"), number: val("k_num"), stage: val("k_stage") || "prep", deadlines: [] };
    if (val("k_dl")) c.deadlines.push({ id: uid(), date: val("k_dl"), note: val("k_dlnote"), done: false });
    S.cases.unshift(c); say(L("Ish qo‘shildi", "Дело добавлено"));
  }
  else if (f === "dl"){ const c = S.cases.find(x => x.id === e.target.dataset.case), d = e.target.date.value; if (!c || !d) return; c.deadlines.push({ id: uid(), date: d, note: e.target.note.value.trim(), done: false }); c.deadlines.sort((a, b) => a.date.localeCompare(b.date)); }
  else if (f === "letterhead"){ S.letterhead = { on: document.getElementById("lh_on").checked, lines: [0, 1, 2, 3].map(i => val(`lh_${i}`)) }; say(L("Blanka saqlandi", "Бланк сохранён")); }
  else if (f === "tpl"){ saveTpl(); say(L("Shablon saqlandi", "Шаблон сохранён")); }
  else if (f === "org"){
    S.org.name = val("o_name");
    if (val("d_title")) S.org.docs.unshift({ id: uid(), type: val("d_type"), title: val("d_title"), number: val("d_num"), url: /^https?:\/\//.test(val("d_url")) ? val("d_url") : "", text: val("d_text") });
    say(L("Saqlandi", "Сохранено"));
  }
  save(); go(tab);
});
function saveTpl(){
  const t = { id: editing || uid(), title: val("t_title"), text: document.getElementById("t_text").value };
  const i = S.templates.findIndex(x => x.id === t.id);
  if (i >= 0) S.templates[i] = t; else S.templates.unshift(t);
  editing = t.id;
}
panel.addEventListener("change", e => {
  const a = e.target.dataset.act;
  if (e.target.name === "plan"){ S.plan = e.target.value; save(); go(tab); return; }
  if (a === "stage"){ const c = S.cases.find(x => x.id === e.target.dataset.id); if (c){ c.stage = e.target.value; save(); } return; }
  if (a === "dlDone"){ const c = S.cases.find(x => x.id === e.target.dataset.case), d = c?.deadlines.find(x => x.id === e.target.dataset.id); if (d){ d.done = e.target.checked; save(); go(tab); } return; }
  if (e.target.id === "importFile" && e.target.files[0]){
    e.target.files[0].text().then(t => { const d = JSON.parse(t); if (!d || d.v !== 1 || !Array.isArray(d.cases)) throw 0; S = { ...EMPTY(), ...d }; save(); go("umumiy"); say(L("Ma’lumotlar tiklandi", "Данные восстановлены")); })
      .catch(() => say(L("Fayl mos emas", "Файл не подходит")));
  }
});
panel.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b || b.tagName === "SELECT" || b.type === "checkbox") return;
  const a = b.dataset.act, id = b.dataset.id;
  const del = (list, msg) => { const i = list.findIndex(x => x.id === id); if (i >= 0) list.splice(i, 1); say(msg); };
  if (a === "delClient"){ del(S.clients, L("Mijoz o‘chirildi", "Клиент удалён")); S.cases.forEach(c => { if (c.clientId === id) c.clientId = ""; }); }
  else if (a === "delCase") del(S.cases, L("Ish o‘chirildi", "Дело удалено"));
  else if (a === "delDl"){ const c = S.cases.find(x => x.id === b.dataset.case); if (c) c.deadlines = c.deadlines.filter(d => d.id !== id); }
  else if (a === "tplEdit"){ editing = id; go("shablonlar"); document.getElementById("t_title").focus(); return; }
  else if (a === "tplNew"){ editing = ""; go("shablonlar"); document.getElementById("t_title").focus(); return; }
  else if (a === "tplDel"){ del(S.templates, L("Shablon o‘chirildi", "Шаблон удалён")); if (editing === id) editing = ""; }
  else if (a === "tplDl"){
    const text = document.getElementById("t_text").value;
    try { b.disabled = true; await customDoc(val("t_title"), text, b.dataset.fmt); } catch (x){ say(x.message); } finally { b.disabled = false; }
    return;
  }
  else if (a === "delDoc") del(S.org.docs, L("Hujjat o‘chirildi", "Документ удалён"));
  else if (a === "toTpl"){ const d = S.org.docs.find(x => x.id === id); if (d){ const t = { id: uid(), title: d.title, text: d.text }; S.templates.unshift(t); editing = t.id; save(); go("shablonlar"); say(L("Shablonga aylantirildi", "Превращено в шаблон")); } return; }
  else if (a === "addLaw"){ const l = META?.laws[b.dataset.k]; if (l) S.org.docs.push({ id: uid(), type: "qonun", title: l.name, number: "", url: l.url, text: "" }); }
  else if (a === "export"){ download(new Blob([JSON.stringify(S, null, 1)], { type:"application/json" }), `huquqyol-kabinet-${iso()}.json`); return; }
  else if (a === "ics"){ download(new Blob([ics()], { type:"text/calendar" }), "huquqyol-muddatlar.ics"); return; }
  else return;
  save(); go(tab);
});
function ics(){
  const esc2 = s => String(s).replace(/[\\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");
  const ev = deadlines().filter(d => !d.done).map(d => { const day = d.date.replace(/-/g, "");
    return ["BEGIN:VEVENT", `UID:${d.id}@huquqyol`, `DTSTAMP:${iso().replace(/-/g, "")}T000000Z`, `DTSTART;VALUE=DATE:${day}`, `SUMMARY:${esc2(`${d.note || L("Muddat", "Срок")} — ${d.case.title}`)}`,
      "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${esc2(d.note || d.case.title)}`, "END:VALARM", "END:VEVENT"].join("\r\n"); });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HuquqYol//Kabinet//UZ", "CALSCALE:GREGORIAN", ...ev, "END:VCALENDAR"].join("\r\n");
}

go(tab);
const pull = !SYNC ? Promise.resolve() : fetch("/api/cabinet", { credentials:"same-origin" }).then(r => r.ok ? r.json() : null).then(d => {
  if (!d) return;
  const server = d.data, local = S.savedAt || "";
  if (server && server.v === 1 && (!local || (server.savedAt || "") >= local)){ S = { ...EMPTY(), ...server, syncedAt: d.updatedAt }; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} setSync("saved"); }
  else if (local && (S.clients.length || S.cases.length || S.templates.length || S.org.docs.length || S.letterhead.lines.some(Boolean))) pushServer();
}).catch(() => setSync("error"));
Promise.all([getMeta(), getCourts(), pull]).then(() => go(tab));
