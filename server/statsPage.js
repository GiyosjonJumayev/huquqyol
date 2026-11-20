// Ochiq «Anonim statistika» sahifasi: serverda chiziladi, JavaScript kerak emas.
// Diagrammalar SVG: kenglik foiz atributi bilan (inline style yo‘q — qat’iy CSP ga mos).
import { makeT, HTML_LANG, fmtDate, fmtSum } from "../public/i18n.js";
import { toCyrillic } from "../public/translit.js";
import { kbFor } from "./kb.js";
import { parseISO } from "./dates.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const num = n => fmtSum(n || 0);
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

export function statsPage({ lang, s, cssHref, themeHref, fs, theme }){
  const t = makeT(lang), base = lang === "ru" ? "ru" : "uz", cy = x => lang === "cyr" ? toCyrillic(x) : x;
  const kb = kbFor(base);
  const date = d => cy(fmtDate(parseISO(d), base));
  const short = d => `${d.slice(8, 10)}.${d.slice(5, 7)}`;

  // Sohalar: kamayish tartibida; murojaati yo‘q sohalar ham ko‘rsatiladi (qamrov to‘liq ko‘rinsin)
  const domains = kb.DOMAINS.map(d => ({ id:d.id, title:cy(d.title), n:s.byDomain[d.id] || 0, docs:s.docsByDomain[d.id] || 0 }))
    .sort((a, b) => b.n - a.n || a.title.localeCompare(b.title));
  const maxD = Math.max(1, ...domains.map(d => d.n));
  const bar = (n, max) => `<svg class="hbar" width="100%" height="12" aria-hidden="true" focusable="false"><rect class="track" width="100%" height="12" rx="4"/>${n ? `<rect class="fill" width="${Math.max(1, n / max * 100).toFixed(2)}%" height="12" rx="4"/>` : ""}</svg>`;
  const domainRows = domains.map(d => `<tr role="row"><th scope="row" role="rowheader">${esc(d.title)}</th><td class="barcell" role="cell">${bar(d.n, maxD)}</td><td class="numc" role="cell">${num(d.n)}</td><td class="numc muted share" role="cell">${pct(d.n, s.total)}%</td><td class="numc docsc" role="cell">${num(d.docs)}</td></tr>`).join("");

  const scen = Object.entries(s.byScenario).filter(([id]) => kb.SCENARIO_BY_ID[id]).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxS = Math.max(1, ...scen.map(x => x[1]));
  const scenRows = scen.map(([id, n]) => { const sc = kb.SCENARIO_BY_ID[id];
    return `<tr role="row"><th scope="row" role="rowheader">${esc(cy(sc.title))}<span class="small muted"> · ${esc(cy(kb.DOMAINS.find(d => d.id === sc.domain)?.title || ""))}</span></th><td class="barcell" role="cell">${bar(n, maxS)}</td><td class="numc" role="cell">${num(n)}</td></tr>`; }).join("");

  // So‘nggi 30 kun: ustunlar (har birida <title> — kursor olib borilganda qiymat)
  const ser = s.series, maxY = Math.max(1, ...ser.map(x => x.opens)), H = 150, w = 100 / ser.length;
  const cols = ser.map((x, i) => { const h = x.opens ? Math.max(3, x.opens / maxY * (H - 4)) : 0;
    return `<g><title>${esc(date(x.day))}: ${num(x.opens)} ${esc(t("stMurojaat"))}</title><rect class="hit" x="${(i * w).toFixed(3)}%" y="0" width="${w.toFixed(3)}%" height="${H}"/>${h ? `<rect class="fill" x="${(i * w + w * 0.12).toFixed(3)}%" y="${(H - h).toFixed(1)}" width="${(w * 0.76).toFixed(3)}%" height="${h.toFixed(1)}" rx="3"/>` : ""}</g>`; }).join("");
  const days30 = ser.reduce((a, x) => a + x.opens, 0);
  const trend = `<figure class="trend">
    <div class="trendy"><span>${num(maxY)}</span><span>0</span></div>
    <div class="trendplot"><svg width="100%" height="${H}" role="img" aria-label="${esc(t("stTrendAria", { n: num(days30) }))}"><line class="grid" x1="0" x2="100%" y1="0.5" y2="0.5"/><line class="base" x1="0" x2="100%" y1="${H - 0.5}" y2="${H - 0.5}"/>${cols}</svg>
    <div class="trendx"><span>${short(ser[0].day)}</span><span>${short(ser[Math.floor(ser.length / 2)].day)}</span><span>${short(ser.at(-1).day)}</span></div></div>
  </figure>
  <details class="more"><summary>${t("stTable")}</summary><table class="stt"><thead><tr><th scope="col">${t("stDay")}</th><th scope="col" class="numc">${t("stOpens")}</th><th scope="col" class="numc">${t("stDocs")}</th></tr></thead>
    <tbody>${[...ser].reverse().map(x => `<tr><th scope="row">${esc(date(x.day))}</th><td class="numc">${num(x.opens)}</td><td class="numc">${num(x.docs)}</td></tr>`).join("")}</tbody></table></details>`;

  const tile = (v, label, sub) => `<div class="stattile"><div class="stv">${v}</div><div class="stl">${esc(label)}</div>${sub ? `<div class="small muted">${esc(sub)}</div>` : ""}</div>`;
  const body = !s.enabled ? `<p class="card">${t("stOff")}</p>` : `
    <div class="stattiles">
      ${tile(num(s.total), t("stTotal"), t("stTotalSub"))}
      ${tile(num(s.documents), t("stDocsT"), t("stDocsSub"))}
      ${tile(`${pct(s.outOfScope, s.analyzed)}%`, t("stOut"), t("stOutSub", { a: num(s.outOfScope), b: num(s.analyzed) }))}
    </div>
    ${s.total === 0 ? `<p class="card stempty">${t("stEmpty")}</p>` : ""}
    <section aria-labelledby="stD"><h2 class="sec" id="stD">${t("stByDomain")}</h2>
      <table class="stt bars" role="table"><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">${t("stDomain")}</th><th scope="col" role="columnheader" class="barcell"><span class="sr">${t("stShareBar")}</span></th><th scope="col" role="columnheader" class="numc">${t("stOpens")}</th><th scope="col" role="columnheader" class="numc share">${t("stShare")}</th><th scope="col" role="columnheader" class="numc docsc">${t("stDocs")}</th></tr></thead><tbody role="rowgroup">${domainRows}</tbody></table></section>
    <section aria-labelledby="stT"><h2 class="sec" id="stT">${t("stTrend")}</h2>${trend}</section>
    ${scen.length ? `<section aria-labelledby="stS"><h2 class="sec" id="stS">${t("stTop")}</h2><table class="stt bars" role="table"><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">${t("stCase")}</th><th scope="col" role="columnheader" class="barcell"><span class="sr">${t("stShareBar")}</span></th><th scope="col" role="columnheader" class="numc">${t("stOpens")}</th></tr></thead><tbody role="rowgroup">${scenRows}</tbody></table></section>` : ""}`;

  const ext = (href, label) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}<svg class="ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg><span class="sr">${t("newTab")}</span></a>`;
  return `<!doctype html><html${fs ? ` data-fs="${fs}"` : ""}${theme ? ` data-theme="${theme}"` : ""} lang="${HTML_LANG[lang]}" data-lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t("stTitle"))} — HuquqYo‘l</title><meta name="description" content="${esc(t("stLead"))}"><link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
<meta name="theme-color" content="#F5F6F2" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0B111C" media="(prefers-color-scheme: dark)"><meta name="color-scheme" content="light dark">
<link rel="stylesheet" href="${cssHref}">${themeHref ? `<script src="${themeHref}" defer></script>` : ""}</head>
<body><a class="skip" href="#main">${t("skip")}</a><div class="sr" aria-live="polite" id="live"></div>
<header class="site-head"><div class="wrap headin">
<a class="brand" href="/" aria-label="${esc(t("homeLabel"))}"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20" fill="none" stroke="var(--accent)" stroke-width="2.2"/><path d="M12 31 C 16 22, 26 26, 30 13" fill="none" stroke="var(--ink)" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="3 4"/><circle cx="12" cy="31" r="3" fill="var(--accent)"/><circle cx="30" cy="13" r="3.4" fill="var(--stamp)"/></svg><span class="brandtxt"><span class="bname">HuquqYo‘l</span><span class="btag">${t("tagline")}</span></span></a>
<nav class="hnav" aria-label="${esc(t("mainNav"))}"><a href="/">${t("navDomains")}</a><a href="/statistika" aria-current="page">${t("stLink")}</a></nav>
<div class="topact"><button class="btn ghost icon themebtn" type="button" data-theme-toggle aria-pressed="false" title="${esc(t("themeDark"))}" data-label-dark="${esc(t("themeDark"))}" data-label-light="${esc(t("themeLight"))}"><svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg><svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg><span class="sr">${t("themeDark")}</span></button>
<nav class="langsw" aria-label="${esc(t("langGroup"))}">${[["uz","O‘zb"],["cyr","Ўзб"],["ru","Рус"]].map(([l, n]) => `<a href="/statistika?lang=${l}" ${l === lang ? `aria-current="page"` : ""} lang="${HTML_LANG[l]}">${n}</a>`).join("")}</nav></div>
</div></header>
<div class="wrap page"><main id="main" class="stats">
<h1>${t("stTitle")}</h1>
<p class="lead">${t("stLead")}</p>
${body}
<section aria-labelledby="stH"><h2 class="sec" id="stH">${t("stHow")}</h2><ul class="sthow">
  <li>${t("stHow1")}</li><li>${t("stHow2")}</li><li>${t("stHow3")}</li><li>${t("stHow4")}</li></ul></section>
<p class="small muted">${esc(t("stSince", { date: date(s.since) }))} <a href="/api/stats">${t("stJson")}</a></p>
<p><a class="btn primary" href="/">${t("toHome")}</a></p>
</main></div>
<footer class="site-foot"><div class="wrap footgrid">
<div class="footbrand"><div class="fbrand"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20" fill="none" stroke="var(--accent)" stroke-width="2.2"/><path d="M12 31 C 16 22, 26 26, 30 13" fill="none" stroke="var(--ink)" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="3 4"/><circle cx="12" cy="31" r="3" fill="var(--accent)"/><circle cx="30" cy="13" r="3.4" fill="var(--stamp)"/></svg><span>HuquqYo‘l</span></div><p>${t("footAbout")}</p></div>
<nav class="footcol" aria-labelledby="fSrc"><h2 id="fSrc">${t("footSources")}</h2><ul><li>${ext("https://lex.uz", t("footLex"))}</li><li>${ext("https://my.sud.uz/", t("footCourt"))}</li><li>${ext("https://my.gov.uz/", t("footGov"))}</li></ul></nav>
<div class="footcol"><h2>${t("footPrivacy")}</h2><ul><li class="fnote">${t("footNoStore")}</li><li>${ext("https://github.com/GiyosjonJumayev/huquqyol", t("footCode"))}</li></ul></div>
</div><div class="wrap footbar"><p class="disclaim"><b>${t("disclaimerB")}</b> ${t("disclaimer")}</p><p class="small copy">© 2026 HuquqYo‘l · ${t("footTeam")}</p></div></footer>
</body></html>`;
}
