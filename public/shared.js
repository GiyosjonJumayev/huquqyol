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
  chev: '<path d="m7 10 5 5 5-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
  profile: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><circle cx="12" cy="10" r="2.6"/><path d="M8 16.5c.6-1.7 2.1-2.6 4-2.6s3.4.9 4 2.6"/>',
  shield: '<path d="M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>'
};
const ni = (k, cls = "") => `<svg class="ni ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${NI[k]}</svg>`;
const LOGO = '<svg class="logo" viewBox="0 0 34 34" aria-hidden="true" focusable="false"><circle cx="17" cy="17" r="15.5" fill="#1E5B52"/><path d="M9 24 C14 21 12 14 25 10" fill="none" stroke="#FBF7EF" stroke-width="2" stroke-dasharray="3 3"/><circle cx="25" cy="10" r="2.6" fill="#E2A33B"/></svg>';
// O‘zbekiston bayrog‘i — til tugmasida (sayt mamlakati belgisi)
const FLAG = '<svg class="flag" width="20" height="14" viewBox="0 0 22 15" aria-hidden="true" focusable="false"><rect width="22" height="15" fill="#FFFFFF"/><rect width="22" height="4.6" fill="#0099B5"/><rect y="10.4" width="22" height="4.6" fill="#1EB53A"/><rect y="4.6" width="22" height=".6" fill="#CE1126"/><rect y="9.8" width="22" height=".6" fill="#CE1126"/></svg>';
const LANG_LABEL = { uz:["O‘zb", "O‘zbekcha (lotin)"], cyr:["Ўзб", "Ўзбекча (кирилл)"], ru:["Рус", "Русский"] };
const initialsOf = n => String(n || "").split(/\s+/).filter(w => /^\p{L}/u.test(w)).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "•";

// Kirmagan foydalanuvchi ko‘radigan bo‘limlar. Har bir rol uchun ro‘yxat serverda: server/access.js navFor()
export const GUEST_NAV = ["/", "/yuristlar", "/tariflar"];
const ROLE_KEY = { citizen: "roleCitizen", lawyer: "roleLawyer", org: "roleOrg", moderator: "roleModerator", admin: "roleAdmin" };
// Hisob menyusidagi bandlar (faqat rol ocha oladiganlari ko‘rinadi)
const ACCT_LINKS = [["/hisob", "user", "navAccount"], ["/hisob/profil", "profile", "navProfile"], ["/admin", "shield", "navAdmin"]];
export const logoutHTML = t => `<button class="btn danger logoutbtn" type="button" data-logout>${ni("logout")}<span>${esc(t("navLogout"))}</span></button>`;

/** Hisob bloki: kirmagan — «Kirish» (+ panelda «Ro‘yxatdan o‘tish»); kirgan — avatar tugmasi va ochiladigan menyu
 *  (Hisobim / Profil / Admin panel / Chiqish). full — ☰ menyu ichidagi ko‘rinish. */
export function acctHTML(user, t, { full = false, nav = GUEST_NAV, path = "" } = {}){
  if (!user) return full
    ? `<a class="navlink" href="/kirish">${esc(t("navLogin"))}</a><a class="btn primary navcta" href="/royxat">${esc(t("navRegister"))}</a>`
    : `<a class="btn primary navcta" href="/kirish">${esc(t("navLogin"))}</a>`;
  const av = `<span class="av" aria-hidden="true">${esc(initialsOf(user.name))}</span>`;
  const who = `<span class="accwho2"><b>${esc(user.name)}</b><small>${esc(t(ROLE_KEY[user.role] || "roleCitizen"))}</small></span>`;
  const links = ACCT_LINKS.filter(([href]) => nav.includes(href))
    .map(([href, ic, k]) => `<a class="ddlink" href="${href}"${path.split("?")[0] === href ? ` aria-current="page"` : ""}>${ni(ic)}<span>${esc(t(k))}</span></a>`).join("");
  if (full) return `<div class="acctbox">${av}${who}</div><nav class="acctlinks" aria-label="${esc(t("navAcctMenu"))}">${links}</nav>${logoutHTML(t)}`;
  return `<details class="navdd acctdd"><summary class="navuser" aria-label="${esc(t("navAcctMenu"))}: ${esc(user.name)}">${av}<span class="un" aria-hidden="true">${esc(user.name)}</span>${ni("chev", "chev")}</summary>
    <div class="ddpanel acctpanel"><div class="acctbox">${av}${who}</div>${links}<div class="ddsep" role="presentation"></div>${logoutHTML(t)}</div></details>`;
}

/** Navbar: barcha sahifalarda bitta. nav — rol ocha oladigan sahifalar (server/access.js navFor); qolganlari yashiriladi.
 *  Kirgan foydalanuvchida (data-auth) 1280px gacha hamma narsa ☰ menyuga yig‘iladi — hech narsa ustma-ust tushmaydi. */
export function siteNav({ lang = "uz", t, mode = "page", path = "/", user = null, langHref = l => `?lang=${l}`, a11y = false, nav = GUEST_NAV }){
  const cur = p => (path.split("?")[0] === p ? ` aria-current="page"` : "");
  const links = [["/yuristlar", "lawyers", "navLawyers"], ["/tariflar", "plans", "navPlans"], ["/kabinet", "cabinet", "navCabinet"]];
  const applyLink = mode === "app"
    ? `<button type="button" class="navlink" data-go="1">${ni("apply")}<span>${esc(t("navApply"))}</span></button>`
    : `<a class="navlink" href="/"${cur("/")}>${ni("apply")}<span>${esc(t("navApply"))}</span></a>`;
  const faqLink = mode === "app"
    ? `<button type="button" class="navlink" data-go="1" data-to="savollar"><span>${esc(t("navFaq"))}</span></button>`
    : `<a class="navlink" href="/#savollar"><span>${esc(t("navFaq"))}</span></a>`;
  const linksHTML = applyLink + links.map(([href, ic, k]) => `<a class="navlink" href="${href}" data-nav="${href}"${cur(href)}${nav.includes(href) ? "" : " hidden"}>${ni(ic)}<span>${esc(t(k))}</span></a>`).join("") + faqLink;
  const langs = ["uz", "cyr", "ru"].map(l => mode === "app"
    ? `<button type="button" data-lang="${l}" aria-pressed="${l === lang}" lang="${l === "cyr" ? "uz-Cyrl" : l}" title="${LANG_LABEL[l][1]}">${LANG_LABEL[l][0]}</button>`
    : `<a href="${esc(langHref(l))}"${l === lang ? ` aria-current="page"` : ""} lang="${l === "cyr" ? "uz-Cyrl" : l}" title="${LANG_LABEL[l][1]}">${LANG_LABEL[l][0]}</a>`).join("");
  const langGroup = `<div class="langsw" role="group" aria-label="${esc(t("langGroup"))}">${langs}</div>`;
  const brand = mode === "app"
    ? `<button class="brand" id="home" type="button" aria-label="${esc(t("homeLabel"))}">${LOGO}<span class="bname">HuquqYo‘l</span></button>`
    : `<a class="brand" href="/" aria-label="${esc(t("homeLabel"))}">${LOGO}<span class="bname">HuquqYo‘l</span></a>`;
  const a11yBtn = a11y ? `<button class="btn ghost a11ybtn" id="a11yBtn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="a11yDlg" title="${esc(t("a11y"))}"><span class="aa" aria-hidden="true">Aa</span><span class="a11ylbl sr">${esc(t("a11y"))}</span></button>` : "";
  return `<div class="navbar"${user ? " data-auth" : ""}>
    ${brand}
    <nav class="navlinks" aria-label="${esc(t("navLabel"))}">${linksHTML}</nav>
    <div class="navright">
      ${a11yBtn}
      <details class="navdd langdd"><summary title="${esc(t("langGroup"))}">${FLAG}<span>${LANG_LABEL[lang][0]}</span>${ni("chev", "chev")}<span class="sr"> — ${esc(t("langGroup"))}</span></summary><div class="ddpanel">${langGroup}</div></details>
      <div class="acct" data-acct>${acctHTML(user, t, { nav, path })}</div>
      <details class="navdd navmenu"><summary aria-label="${esc(t("navMenu"))}">${ni("menu")}</summary>
        <div class="ddpanel menupanel">
          <nav class="menulinks" aria-label="${esc(t("navLabel"))}">${linksHTML}</nav>
          ${langGroup}
          <div class="acct full" data-acct-full>${acctHTML(user, t, { full: true, nav, path })}</div>
        </div></details>
    </div>
  </div>`;
}

/** Bosh sahifa keshlanadi: hisob holati /api/me dan keladi — navbar shu bilan yangilanadi. */
export function applyNavState(d, t){
  const nav = d?.nav || GUEST_NAV, user = d?.user || null;
  document.querySelectorAll("[data-nav]").forEach(a => { a.hidden = !nav.includes(a.dataset.nav); });
  document.querySelectorAll(".navbar").forEach(n => n.toggleAttribute("data-auth", !!user));
  if (user){
    document.querySelectorAll("[data-acct]").forEach(el => { el.innerHTML = acctHTML(user, t, { nav }); });
    document.querySelectorAll("[data-acct-full]").forEach(el => { el.innerHTML = acctHTML(user, t, { full: true, nav }); });
  }
  dispatchEvent(new Event("hy:layout"));             // navbar sig‘ishi — yangi tarkib bilan qayta o‘lchanadi (public/session.js)
}

export const examplesHTML = lang => examples(lang).map((e, i) => `<button class="chipbtn" type="button" data-ex="${i}">${esc(e)}</button>`).join("");

/* ---------- «Aa Qulaylik» oynasi (barcha sahifalar uchun bitta) ---------- */
// Modal <dialog>: shrift o‘lchami (4 daraja), ovozli o‘qish, yorug‘/qorong‘i mavzu. Boshqaruv — public/a11y.js (mountA11y).
const SPK = '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>';
export function a11yDialogHTML(t){
  const fs = [0, 1, 2, 3].map(i => `<button type="button" data-fs="${i}" aria-pressed="false"><span class="fsA" aria-hidden="true">A</span>${esc(t("fs" + i))}</button>`).join("");
  return `<dialog class="a11ydlg" id="a11yDlg" aria-labelledby="a11yH">
  <div class="a11yin">
    <div class="a11ytop"><h2 class="a11yh" id="a11yH">${esc(t("a11yTitle"))}</h2>
      <button class="a11yx" type="button" data-a11y-close><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg><span class="sr">${esc(t("close"))}</span></button></div>
    <div class="a11yrow">
      <span class="a11yname" id="fsLbl">${esc(t("fsLabel"))}</span>
      <div class="fsopts" role="group" aria-labelledby="fsLbl">${fs}</div>
    </div>
    <div class="a11yrow" id="ttsRow">
      <span class="a11yname" id="ttsLbl">${esc(t("ttsLabel"))}</span>
      <div class="ttsopts">
        <button class="btn primary" id="ttsPage" type="button" data-tts aria-pressed="false" data-on="${esc(t("ttsOff"))}" data-off="${esc(t("ttsPage"))}">${SVG(SPK)}<span class="ttslbl">${esc(t("ttsPage"))}</span></button>
        <div class="speed" role="group" aria-label="${esc(t("ttsSpeed"))}">
          <span class="small muted" aria-hidden="true">${esc(t("ttsSpeed"))}:</span>
          <button type="button" data-rate="0.8" aria-pressed="false">${esc(t("ttsSlow"))}</button>
          <button type="button" data-rate="1" aria-pressed="true">${esc(t("ttsNormal"))}</button>
        </div>
      </div>
      <p class="small muted ttsnote" id="ttsNote" data-none="${esc(t("ttsNone"))}">${esc(t("ttsSelHint"))}</p>
    </div>
    <div class="a11yrow">
      <span class="a11yname" id="thLbl">${esc(t("themeLabel"))}</span>
      <div class="thopts" role="group" aria-labelledby="thLbl">
        <button type="button" data-set-theme="light" aria-pressed="false">${ni("sun")}${esc(t("themeLight"))}</button>
        <button type="button" data-set-theme="dark" aria-pressed="false">${ni("moon")}${esc(t("themeDark"))}</button>
      </div>
    </div>
  </div>
</dialog>
<div class="ttsbar" id="ttsBar" role="region" aria-label="${esc(t("ttsLabel"))}" hidden data-reading="${esc(t("ttsReading"))}" data-paused="${esc(t("ttsPaused"))}" data-pause="${esc(t("ttsPause"))}" data-resume="${esc(t("ttsResume"))}" data-err="${esc(t("ttsErr"))}" data-no-uz="${esc(t("ttsNoUz"))}" data-fs-done="${esc(t("fsDone"))}" data-fs-names="${esc([0, 1, 2, 3].map(i => t("fs" + i)).join("|"))}">
  <span class="ttsdot" aria-hidden="true"></span><span class="ttsstate" id="ttsState" aria-live="polite">${esc(t("ttsReading"))}</span>
  <button class="btn ghost sm" id="ttsPause" type="button">${esc(t("ttsPause"))}</button>
  <button class="btn primary sm" id="ttsStopBtn" type="button">${esc(t("ttsStop"))}</button>
</div>`;
}

/* ---------- Umumiy pastki qism (footer) ---------- */
// Telegram bot havolasi. Serverda TELEGRAM_BOT_URL bilan almashtirish mumkin: "https://t.me/nom", "t.me/nom", "@nom" yoki "nom".
// Noto‘g‘ri qiymat bo‘lsa — havola «Maxfiylik» sahifasidagi bot bo‘limiga olib boradi.
export const TELEGRAM_BOT_URL = "https://t.me/huquq_yol_bot";
export function botUrlOf(v){
  const m = /^(?:https?:\/\/)?(?:t\.me\/|@)?([A-Za-z]\w{4,31})\/?$/.exec(String(v || "").trim());
  return m ? `https://t.me/${m[1]}` : "";
}
export const botHref = (url = TELEGRAM_BOT_URL) => botUrlOf(url) || botUrlOf(TELEGRAM_BOT_URL) || "/maxfiylik#bot";
// mode "app" — bosh sahifa (o‘chirish tugmasi joyida ishlaydi); boshqa sahifalarda — bosh sahifaga o‘tib o‘chiriladi
export function siteFooter(t, { mode = "page", path = "/", botUrl = TELEGRAM_BOT_URL } = {}){
  const bh = botHref(botUrl), ext = bh.startsWith("https:");
  const cur = p => (path.split("?")[0] === p ? ` aria-current="page"` : "");
  const out = (href, label) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${esc(label)}<span class="sr"> ${esc(t("newTab"))}</span></a>`;
  const wipe = mode === "app"
    ? `<button class="linkbtn" id="wipe" type="button">${esc(t("wipe"))}</button>`
    : `<a href="/?ochirish=1">${esc(t("wipe"))}</a>`;
  return `<footer class="sitefoot">
  <span class="ikatf" aria-hidden="true"></span>
  <div class="footin">
    <div class="footgrid">
      <div class="footbrand">
        <p class="fbname">HuquqYo‘l</p>
        <p class="motto hand">${esc(t("footMotto"))}</p>
        <div class="disclaim" role="note"><p><b>${esc(t("disclaimerB"))}</b> ${esc(t("disclaimer"))} <b class="checked">${esc(t("checked"))}</b></p></div>
        <p class="fsmall">${esc(t("local"))}</p>
      </div>
      <nav class="footlinks" aria-label="${esc(t("footNav"))}">
        <div class="fcol"><h2 class="fh">${esc(t("footHelp"))}</h2><ul>
          <li><a href="/"${cur("/")}>${esc(t("navApply"))}</a></li>
          <li><a href="/yuristlar"${cur("/yuristlar")}>${esc(t("navLawyers"))}</a></li>
          <li><a href="/tariflar"${cur("/tariflar")}>${esc(t("navPlans"))}</a></li>
          <li>${out("https://gov.uz/oz/adliya/sections/professional-mediatorlar-reyestri", t("footMediators"))}</li>
          <li><a href="${esc(bh)}"${ext ? ` target="_blank" rel="noopener noreferrer"` : ""}>${esc(t("footBot"))}${ext ? `<span class="sr"> ${esc(t("newTab"))}</span>` : ""}</a></li>
        </ul></div>
        <div class="fcol"><h2 class="fh">${esc(t("footOfficial"))}</h2><ul>
          <li>${out("https://lex.uz", "lex.uz")}</li>
          <li>${out("https://murojaat.gov.uz", "murojaat.gov.uz")}</li>
          <li>${out("https://pm.gov.uz", "pm.gov.uz")}</li>
          <li>${out("https://yurxizmat.uz", "yurxizmat.uz")}</li>
        </ul></div>
      </nav>
    </div>
    <div class="footbottom"><span>${esc(t("footCopy"))}</span>
      <ul class="footmini" aria-label="${esc(t("footNav"))}">
        <li><a href="/maxfiylik"${cur("/maxfiylik")}>${esc(t("footPrivacy"))}</a></li>
        <li><a href="/statistika"${cur("/statistika")}>${esc(t("footStats"))}</a></li>
        <li>${wipe}</li>
      </ul></div>
  </div>
</footer>`;
}
