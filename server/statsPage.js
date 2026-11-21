// Ochiq «Anonim statistika» sahifasi: serverda chiziladi, JavaScript kerak emas.
// Diagrammalar SVG: kenglik foiz atributi bilan (inline style yo‘q — qat’iy CSP ga mos).
import { makeT, HTML_LANG, fmtDate, fmtSum } from "../public/i18n.js";
import { toCyrillic } from "../public/translit.js";
import { kbFor } from "./kb.js";
import { siteNav, siteFooter, a11yDialogHTML } from "../public/shared.js";
import { parseISO } from "./dates.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const num = n => fmtSum(n || 0);
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

export function statsPage({ lang, s, cssHref, fs, user = null, accHref = "" }){
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

  return `<!doctype html><html${fs ? ` data-fs="${fs}"` : ""} lang="${HTML_LANG[lang]}" data-lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t("stTitle"))} — HuquqYo‘l</title><meta name="description" content="${esc(t("stLead"))}"><link rel="icon" href="/icons/icon.svg" type="image/svg+xml"><link rel="stylesheet" href="${cssHref}"></head>
<body><a class="skip" href="#main">${t("skip")}</a><div class="wrap">
<header class="nav">${siteNav({ lang, t, mode: "page", path: "/statistika", user, langHref: l => `/statistika?lang=${l}`, a11y: true })}</header>
<main id="main" class="stats">
<h1>${t("stTitle")}</h1>
<p class="lead">${t("stLead")}</p>
${body}
<section aria-labelledby="stH"><h2 class="sec" id="stH">${t("stHow")}</h2><ul class="sthow">
  <li>${t("stHow1")}</li><li>${t("stHow2")}</li><li>${t("stHow3")}</li><li>${t("stHow4")}</li></ul></section>
<p class="small muted">${esc(t("stSince", { date: date(s.since) }))} <a href="/api/stats">${t("stJson")}</a></p>
<p><a class="btn primary" href="/">${t("toHome")}</a></p>
</main>
${siteFooter(t, { path: "/statistika", botUrl: process.env.TELEGRAM_BOT_URL })}</div>
${a11yDialogHTML(t)}${accHref ? `<script type="module" src="${accHref}"></script>` : ""}</body></html>`;
}
