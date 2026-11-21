// Brauzer va server uchun umumiy interfeys bo‘laklari: server bosh sahifani shular bilan oldindan chizadi,
// shuning uchun sahifa ochilganda kontent «sakramaydi».
import { toCyrillic } from "./translit.js";
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const SVG = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
export const ICONS = {
  mehnat: SVG('<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>'),
  istemol: SVG('<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  oila: SVG('<circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="7" r="2.5"/><circle cx="12" cy="13" r="2"/><path d="M3.5 20c0-3 2-5 4.5-5M20.5 20c0-3-2-5-4.5-5M9 21c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5"/>'),
  davlat: SVG('<path d="M3 9l9-5 9 5"/><path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9"/><path d="M3 21h18"/>'),
  jarima: SVG('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
  ijara: SVG('<path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><circle cx="12" cy="13.5" r="2"/><path d="M12 15.5V18"/>'),
  kommunal: SVG('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),
  bank: SVG('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><path d="M7 14.5h4"/>'),
  transport: SVG('<path d="M5 16.5V12l2-5h10l2 5v4.5"/><path d="M3.5 12h17"/><path d="M4 16.5h16"/><circle cx="8" cy="16.5" r="1.8"/><circle cx="16" cy="16.5" r="1.8"/>'),
  nafaqa: SVG('<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v6.5a2 2 0 0 0 4 0"/>'),
  migrant: SVG('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z"/>'),
  fuqarolik: SVG('<circle cx="9" cy="9" r="5"/><path d="M9 7v4M7.5 9h3"/><path d="M14.5 4.6A5 5 0 1 1 13 19"/><path d="M3 21h8"/>')
};
const EX = {
  uz: [
    "Ish beruvchim 3 oydan beri maosh bermayapti, qarzi 9 million so‘m",
    "«Texnomart» do‘konidan olgan televizor 2 haftada buzildi, almashtirmayapti",
    "Hokimlikka ko‘chadagi chiroqlar haqida taklif bermoqchiman",
    "Sobiq erim 2 ta bolamga aliment to‘lamayapti",
    "Hokimlikka murojaat qildim, bir oydan beri javob yo‘q",
    "YHXB radar bo‘yicha noto‘g‘ri jarima soldi",
    "Do‘stimga qarzga bergan 20 million so‘mni qaytarmayapti, tilxat bor",
    "Kvartiradan chiqdim, uy egasi depozitni qaytarmayapti",
    "Kartamdan bilmagan holda 2 million so‘m yechib olishdi",
    "Avtohalokatdan keyin sug‘urta kompaniyasi pul to‘lamayapti",
    "Pensiya jamg‘armasi stajimning bir qismini hisobga olmadi",
    "Koreyaga ishga yuboramiz deb agentlik pul olib, aldadi"
  ],
  ru: [
    "Работодатель 3 месяца не платит зарплату, долг 9 млн сум",
    "Телевизор из магазина «Texnomart» сломался через 2 недели, не меняют",
    "Хочу подать в хокимият предложение по уличному освещению",
    "Бывший муж не платит алименты на двоих детей",
    "Обратился в хокимият, уже месяц нет ответа",
    "СБДД выписали неправильный штраф по радару",
    "Друг не возвращает долг 20 млн сум, есть расписка",
    "Съехал с квартиры, хозяин не возвращает залог",
    "С моей карты без моего ведома списали 2 млн сум",
    "После ДТП страховая компания не платит",
    "Пенсионный фонд не учёл часть моего стажа",
    "Агентство взяло деньги за работу в Корее и обмануло"
  ]
};
export const examples = lang => lang === "ru" ? EX.ru : lang === "cyr" ? EX.uz.map(toCyrillic) : EX.uz;
export const EXAMPLES = EX.uz;

export const domainCardsHTML = (meta, t) => meta.domains.map(d => {
  const n = meta.scenarios.filter(s => s.domain === d.id).length;
  return `<button class="case domain" type="button" data-domain="${d.id}"><span class="ic">${ICONS[d.id] || ""}</span><span><b>${esc(d.title)}</b><span>${esc(d.desc)}</span><span class="count">${esc(n === 1 ? t("startCase") : t("casesCount", { n }))}</span></span></button>`;
}).join("");
// ---------- Navbar: barcha sahifalar uchun bitta ----------
// mode "app" — bosh ilova (brend va «Ariza tayyorlash» — SPA tugmalari, til — data-lang tugmalari, hisob — /api/me dan JS bilan);
// mode "page" — serverda chiziladigan sahifalar (havolalar, til — ?lang=, hisob — serverdan).
const NI = {
  apply: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5z"/><path d="M14 3.5V8h4"/><path d="M9 12.5h6M9 16h4"/>',
  lawyers: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.8 14.2c2.4.2 4.2 1.9 4.7 4.8"/>',
  plans: '<path d="M4 12.5 12 4h7.5v7.5L11 20z"/><circle cx="15.5" cy="8.5" r="1.4"/>',
  cabinet: '<rect x="3.5" y="6.5" width="17" height="13" rx="2.5"/><path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5"/><path d="M3.5 12h17"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5s1.2-6.1 3.5-8.5z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  chev: '<path d="m7 10 5 5 5-5"/>'
};
const ni = (k, cls = "") => `<svg class="ni ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${NI[k]}</svg>`;
const LOGO = '<svg class="logo" viewBox="0 0 44 44" aria-hidden="true" focusable="false"><circle cx="22" cy="22" r="20" fill="none" stroke="var(--accent)" stroke-width="2.2"/><path d="M12 31 C 16 22, 26 26, 30 13" fill="none" stroke="var(--ink)" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="3 4"/><circle cx="12" cy="31" r="3" fill="var(--accent)"/><circle cx="30" cy="13" r="3.4" fill="var(--stamp)"/></svg>';
const LANG_LABEL = { uz:["O‘zb", "O‘zbekcha (lotin)"], cyr:["Ўзб", "Ўзбекча (кирилл)"], ru:["Рус", "Русский"] };
const initialsOf = n => String(n || "").split(/\s+/).filter(w => /^\p{L}/u.test(w)).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "•";

/** Hisob bloki: kirmagan — «Kirish» (+ panelda «Ro‘yxatdan o‘tish»); kirgan — avatar va ism (+ admin uchun «Admin»). */
export function acctHTML(user, t, { full = false } = {}){
  if (!user) return full
    ? `<a class="navlink" href="/kirish">${esc(t("navLogin"))}</a><a class="btn primary navcta" href="/royxat">${esc(t("navRegister"))}</a>`
    : `<a class="btn primary navcta" href="/kirish">${esc(t("navLogin"))}</a>`;
  return (user.role === "admin" ? `<a class="navlink" href="/admin">${esc(t("navAdmin"))}</a>` : "")
    + `<a class="navuser" href="/hisob" title="${esc(t("navAccount"))}"><span class="av" aria-hidden="true">${esc(initialsOf(user.name))}</span><span class="un">${esc(user.name)}</span><span class="sr"> — ${esc(t("navAccount"))}</span></a>`;
}

export function siteNav({ lang = "uz", t, mode = "page", path = "/", user = null, langHref = l => `?lang=${l}`, a11y = false }){
  const cur = p => (path.split("?")[0] === p ? ` aria-current="page"` : "");
  const links = [["/yuristlar", "lawyers", "navLawyers"], ["/tariflar", "plans", "navPlans"], ["/kabinet", "cabinet", "navCabinet"]];
  const applyLink = mode === "app"
    ? `<button type="button" class="navlink" data-go="1">${ni("apply")}<span>${esc(t("navApply"))}</span></button>`
    : `<a class="navlink" href="/"${cur("/")}>${ni("apply")}<span>${esc(t("navApply"))}</span></a>`;
  const linksHTML = applyLink + links.map(([href, ic, k]) => `<a class="navlink" href="${href}"${cur(href)}>${ni(ic)}<span>${esc(t(k))}</span></a>`).join("");
  const langs = ["uz", "cyr", "ru"].map(l => mode === "app"
    ? `<button type="button" data-lang="${l}" aria-pressed="${l === lang}" lang="${l === "cyr" ? "uz-Cyrl" : l}" title="${LANG_LABEL[l][1]}">${LANG_LABEL[l][0]}</button>`
    : `<a href="${esc(langHref(l))}"${l === lang ? ` aria-current="page"` : ""} lang="${l === "cyr" ? "uz-Cyrl" : l}" title="${LANG_LABEL[l][1]}">${LANG_LABEL[l][0]}</a>`).join("");
  const langGroup = `<div class="langsw" role="group" aria-label="${esc(t("langGroup"))}">${langs}</div>`;
  const brand = mode === "app"
    ? `<button class="brand" id="home" type="button" aria-label="${esc(t("homeLabel"))}">${LOGO}<span class="bname">HuquqYo‘l<small>${esc(t("navTagline"))}</small></span></button>`
    : `<a class="brand" href="/" aria-label="${esc(t("homeLabel"))}">${LOGO}<span class="bname">HuquqYo‘l<small>${esc(t("navTagline"))}</small></span></a>`;
  const a11yBtn = a11y ? `<button class="btn ghost a11ybtn" id="a11yBtn" type="button" aria-expanded="false" aria-controls="a11yPanel" title="${esc(t("a11y"))}"><span class="aa" aria-hidden="true">Aa</span><span class="a11ylbl sr">${esc(t("a11y"))}</span></button>` : "";
  return `<div class="navbar">
    ${brand}
    <nav class="navlinks" aria-label="${esc(t("navLabel"))}">${linksHTML}</nav>
    <div class="navright">
      ${a11yBtn}
      <details class="navdd langdd"><summary title="${esc(t("langGroup"))}">${ni("globe")}<span>${LANG_LABEL[lang][0]}</span>${ni("chev", "chev")}<span class="sr"> — ${esc(t("langGroup"))}</span></summary><div class="ddpanel">${langGroup}</div></details>
      <div class="acct" data-acct>${acctHTML(user, t)}</div>
      <details class="navdd navmenu"><summary aria-label="${esc(t("navMenu"))}">${ni("menu")}</summary>
        <div class="ddpanel menupanel">
          <nav class="menulinks" aria-label="${esc(t("navLabel"))}">${linksHTML}</nav>
          ${langGroup}
          <div class="acct full" data-acct-full>${acctHTML(user, t, { full: true })}</div>
        </div></details>
    </div>
  </div>`;
}

export const examplesHTML = lang => examples(lang).map((e, i) => `<button class="chipbtn" type="button" data-ex="${i}">${esc(e)}</button>`).join("");
