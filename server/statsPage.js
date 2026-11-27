// Ochiq «Anonim statistika» sahifasi: serverda chiziladi, JavaScript kerak emas.
// Diagrammalar SVG: kenglik foiz atributi bilan (inline style yo‘q — qat’iy CSP ga mos).
import { makeT, HTML_LANG, fmtDate, fmtSum } from "../public/i18n.js";
import { toCyrillic } from "../public/translit.js";
import { kbFor } from "./kb.js";
import { siteNav, siteFooter, a11yDialogHTML } from "../public/shared.js";
import { navFor, roleOf } from "./access.js";
import { parseISO } from "./dates.js";
import { REGIONS } from "./regions.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const num = n => fmtSum(n || 0);
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

export function statsPage({ lang, s, r, plat = null, cssHref, fs, user = null, accHref = "" }){
  const t = makeT(lang), base = lang === "ru" ? "ru" : "uz", cy = x => lang === "cyr" ? toCyrillic(x) : x;
  const kb = kbFor(base);
  const date = d => cy(fmtDate(parseISO(d), base));
  const short = d => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
  const P = r.period, cur = r.current, prev = r.previous;
  const pLabel = t("stP" + P);
  const q = `davr=${P}${lang !== "uz" ? `&lang=${lang}` : ""}`;

  // O‘zgarish: oldingi shunday davrga nisbatan; oldingi davr bo‘sh bo‘lsa — «yangi»
  const delta = (a, b, withText = true) => {
    if (!b) return a ? `<span class="delta new">${esc(t("stNew"))}</span>` : `<span class="delta flat">—</span>`;
    const d = Math.round((a - b) / b * 100);
    const cls = d > 0 ? "up" : d < 0 ? "down" : "flat", sign = d > 0 ? "+" : d < 0 ? "−" : "";
    return `<span class="delta ${cls}">${sign}${Math.abs(d)}%${withText ? `<span class="small muted"> ${esc(t("stVsPrev", { p: pLabel }))}</span>` : ""}</span>`;
  };
  const tile = (v, label, sub, d) => `<div class="stattile"><div class="stv">${v}</div><div class="stl">${esc(label)}</div>${d ? `<div class="stdelta">${d}</div>` : ""}${sub ? `<div class="small muted">${esc(sub)}</div>` : ""}</div>`;
  const bar = (n, max) => `<svg class="hbar" width="100%" height="12" aria-hidden="true" focusable="false"><rect class="track" width="100%" height="12" rx="4"/>${n ? `<rect class="fill" width="${Math.max(1, n / max * 100).toFixed(2)}%" height="12" rx="4"/>` : ""}</svg>`;

  // Davr tanlovi: oddiy havolalar (JavaScript’siz)
  const tabs = `<nav class="pertabs" aria-label="${esc(t("stPeriod"))}">${[7, 30, 90, 365].map(p => `<a href="/statistika?davr=${p}${lang !== "uz" ? `&amp;lang=${lang}` : ""}"${p === P ? ' aria-current="page"' : ""}>${esc(t("stP" + p))}</a>`).join("")}</nav>`;

  // Sohalar: ehtiyoj bo‘yicha (davrdagi murojaatlar), o‘zgarish, hujjatlar, yuristga yuborilgan ishlar
  const domains = kb.DOMAINS.map(d => ({ id:d.id, title:cy(d.title), n:cur.byDomain[d.id] || 0, was:prev.byDomain[d.id] || 0, docs:cur.docsByDomain[d.id] || 0, law:cur.lawByDomain[d.id] || 0 }))
    .sort((a, b) => b.n - a.n || b.docs - a.docs || a.title.localeCompare(b.title));
  const maxD = Math.max(1, ...domains.map(d => d.n));
  const domainRows = domains.map((d, i) => `<tr role="row"><th scope="row" role="rowheader">${esc(d.title)}${i < 3 && d.n ? ` <span class="tag top">${esc(t("stTopNeed"))}</span>` : ""}</th><td class="barcell" role="cell">${bar(d.n, maxD)}</td><td class="numc" role="cell">${num(d.n)}</td><td class="numc muted share" role="cell">${pct(d.n, cur.opens)}%</td><td class="numc chg" role="cell">${delta(d.n, d.was, false)}</td><td class="numc docsc" role="cell">${num(d.docs)}</td><td class="numc docsc" role="cell">${num(d.law)}</td></tr>`).join("");

  // Holatlar (davr ichida)
  const scen = Object.entries(cur.byScenario).filter(([id]) => kb.SCENARIO_BY_ID[id]).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxS = Math.max(1, ...scen.map(x => x[1]));
  const scenRows = scen.map(([id, n]) => { const sc = kb.SCENARIO_BY_ID[id];
    return `<tr role="row"><th scope="row" role="rowheader">${esc(cy(sc.title))}<span class="small muted"> · ${esc(cy(kb.DOMAINS.find(d => d.id === sc.domain)?.title || ""))}</span></th><td class="barcell" role="cell">${bar(n, maxS)}</td><td class="numc" role="cell">${num(n)}</td></tr>`; }).join("");

  // Hududlar: 14 ta hudud, arizalar soni bo‘yicha
  const regName = g => lang === "ru" ? g.ru : lang === "cyr" ? g.cyr : g.name;
  const regs = REGIONS.map(g => ({ ...g, n: cur.byRegion[g.id] || 0 })).sort((a, b) => b.n - a.n || regName(a).localeCompare(regName(b)));
  const regKnown = regs.reduce((a, g) => a + g.n, 0), maxR = Math.max(1, ...regs.map(g => g.n));
  const regRows = regs.map(g => `<tr role="row"><th scope="row" role="rowheader">${esc(regName(g))}</th><td class="barcell" role="cell">${bar(g.n, maxR)}</td><td class="numc" role="cell">${num(g.n)}</td><td class="numc muted share" role="cell">${pct(g.n, regKnown)}%</td></tr>`).join("");

  // Dinamika: 7/30 kun — kunlar, 90 kun — haftalar, 1 yil — oylar
  const ser = r.series, maxY = Math.max(1, ...ser.map(x => x.opens)), H = 150, w = 100 / ser.length;
  const label = x => P <= 30 ? date(x.from) : P === 90 ? `${short(x.from)}–${short(x.to)}` : x.month.split("-").reverse().join(".");
  const axis = x => P <= 30 ? short(x.from) : P === 90 ? short(x.from) : x.month.split("-").reverse().join(".");
  const cols = ser.map((x, i) => { const h = x.opens ? Math.max(3, x.opens / maxY * (H - 4)) : 0;
    return `<g><title>${esc(label(x))}: ${num(x.opens)} ${esc(t("stMurojaat"))} · ${esc(t("stDocs"))}: ${num(x.docs)} · ${esc(t("stUsers"))}: ${num(x.users)}</title><rect class="hit" x="${(i * w).toFixed(3)}%" y="0" width="${w.toFixed(3)}%" height="${H}"/>${h ? `<rect class="fill" x="${(i * w + w * 0.12).toFixed(3)}%" y="${(H - h).toFixed(1)}" width="${(w * 0.76).toFixed(3)}%" height="${h.toFixed(1)}" rx="3"/>` : ""}</g>`; }).join("");
  const bucket = t(P <= 30 ? "stBucketDay" : P === 90 ? "stBucketWeek" : "stBucketMonth");
  const trend = `<figure class="trend">
    <div class="trendy"><span>${num(maxY)}</span><span>0</span></div>
    <div class="trendplot"><svg width="100%" height="${H}" role="img" aria-label="${esc(t("stTrendAriaP", { n: num(cur.opens) }))}"><line class="grid" x1="0" x2="100%" y1="0.5" y2="0.5"/><line class="base" x1="0" x2="100%" y1="${H - 0.5}" y2="${H - 0.5}"/>${cols}</svg>
    <div class="trendx"><span>${esc(axis(ser[0]))}</span><span>${esc(axis(ser[Math.floor(ser.length / 2)]))}</span><span>${esc(axis(ser.at(-1)))}</span></div></div>
  </figure>
  <details class="more"><summary>${t("stTable")}</summary><div class="tscroll" tabindex="0"><table class="stt"><thead><tr><th scope="col">${t("stWhen")}</th><th scope="col" class="numc">${t("stUsers")}</th><th scope="col" class="numc">${t("stOpens")}</th><th scope="col" class="numc">${t("stDocs")}</th></tr></thead>
    <tbody>${[...ser].reverse().map(x => `<tr><th scope="row">${esc(label(x))}</th><td class="numc">${num(x.users)}</td><td class="numc">${num(x.opens)}</td><td class="numc">${num(x.docs)}</td></tr>`).join("")}</tbody></table></div></details>`;

  const days = Math.max(1, P);
  const avg = v => v >= 10 ? num(Math.round(v)) : v.toFixed(1).replace(".", ",");   // kuniga o‘rtacha: kichik sonlarda bir xona kasr
  const platform = plat ? `<section aria-labelledby="stPl"><h2 class="sec" id="stPl">${t("stPlatformH")}</h2><div class="stattiles">
      ${tile(num(plat.users), t("stRegUsers"), t("stRegUsersSub", { n: num(plat.newUsers) }))}
      ${tile(num(plat.lawyers), t("stLawyers"), t("stLawyersSub"))}
      ${tile(num(plat.cons), t("stCons"), t("stConsSub", { n: num(plat.agreed) }))}
    </div></section>` : "";

  const th = (k, cls = "") => `<th scope="col" role="columnheader"${cls ? ` class="${cls}"` : ""}>${t(k)}</th>`;
  const body = !s.enabled ? `<p class="card">${t("stOff")}</p>` : `
    <div class="sthead">${tabs}<p class="small muted strange">${esc(t("stRange", { from: date(r.from), to: date(r.to) }))}</p></div>
    <div class="stattiles six">
      ${tile(num(cur.users), t("stUsers"), t("stUsersSub", { n: avg(cur.users / days) }), delta(cur.users, prev.users))}
      ${tile(num(cur.opens), t("stPlans"), t("stTotalSub"), delta(cur.opens, prev.opens))}
      ${tile(num(cur.docs), t("stDocsT"), t("stDocsConv", { p: pct(cur.docs, cur.opens) }), delta(cur.docs, prev.docs))}
      ${tile(num(cur.lawyer), t("stLaw"), t("stLawSub"), delta(cur.lawyer, prev.lawyer))}
      ${tile(num(cur.photo), t("stPhoto"), t("stPhotoSub"), delta(cur.photo, prev.photo))}
      ${tile(`${pct(cur.outOfScope, cur.analyzed)}%`, t("stOut"), t("stOutSub", { a: num(cur.outOfScope), b: num(cur.analyzed) }))}
    </div>
    ${cur.opens === 0 && cur.docs === 0 ? `<p class="card stempty">${t("stEmpty")}</p>` : ""}
    <section aria-labelledby="stD"><h2 class="sec" id="stD">${t("stNeedH")}</h2><p class="small muted">${t("stNeedLead")}</p>
      <div class="tscroll" tabindex="0"><table class="stt bars need" role="table"><thead role="rowgroup"><tr role="row">${th("stDomain")}<th scope="col" role="columnheader" class="barcell"><span class="sr">${t("stShareBar")}</span></th>${th("stOpens", "numc")}${th("stShare", "numc share")}${th("stChange", "numc chg")}${th("stDocs", "numc docsc")}${th("stToLaw", "numc docsc")}</tr></thead><tbody role="rowgroup">${domainRows}</tbody></table></div></section>
    <section aria-labelledby="stT"><h2 class="sec" id="stT">${t("stTrendP")} <span class="small muted">· ${esc(bucket)}</span></h2>${trend}</section>
    <section aria-labelledby="stR"><h2 class="sec" id="stR">${t("stRegH")}</h2>
      <table class="stt bars" role="table"><thead role="rowgroup"><tr role="row">${th("stRegion")}<th scope="col" role="columnheader" class="barcell"><span class="sr">${t("stShareBar")}</span></th>${th("stDocs", "numc")}${th("stShare", "numc share")}</tr></thead><tbody role="rowgroup">${regRows}</tbody></table>
      <p class="small muted">${esc(t("stRegNote", { n: num(Math.max(0, cur.docs - regKnown)) }))}</p></section>
    ${scen.length ? `<section aria-labelledby="stS"><h2 class="sec" id="stS">${t("stTop")}</h2><table class="stt bars" role="table"><thead role="rowgroup"><tr role="row">${th("stCase")}<th scope="col" role="columnheader" class="barcell"><span class="sr">${t("stShareBar")}</span></th>${th("stOpens", "numc")}</tr></thead><tbody role="rowgroup">${scenRows}</tbody></table></section>` : ""}
    ${platform}`;

  return `<!doctype html><html${fs ? ` data-fs="${fs}"` : ""} lang="${HTML_LANG[lang]}" data-lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t("stTitle"))} — HuquqYo‘l</title><meta name="description" content="${esc(t("stLead"))}"><link rel="icon" href="/icons/icon.svg" type="image/svg+xml"><link rel="stylesheet" href="${cssHref}"></head>
<body><a class="skip" href="#main">${t("skip")}</a><div class="wrap">
<header class="nav">${siteNav({ lang, t, mode: "page", path: "/statistika", user, langHref: l => `/statistika?lang=${l}`, a11y: true, nav: navFor(roleOf(user)) })}</header>
<main id="main" class="stats">
<h1>${t("stTitle")}</h1>
<p class="lead">${t("stLead2")}</p>
${body}
<section aria-labelledby="stH"><h2 class="sec" id="stH">${t("stHow")}</h2><ul class="sthow">
  <li>${t("stHow1")}</li><li>${t("stHow2")}</li><li>${t("stHow5")}</li><li>${t("stHow3")}</li><li>${t("stHow4")}</li></ul></section>
<p class="small muted">${esc(t("stSince", { date: date(s.since) }))} <a href="/api/stats?${q.replace(/&/g, "&amp;")}">${t("stJson")}</a> · <a href="/api/stats.csv?${q.replace(/&/g, "&amp;")}">${t("stCsv")}</a></p>
<p><a class="btn primary" href="/">${t("toHome")}</a></p>
</main>
${siteFooter(t, { path: "/statistika", botUrl: process.env.TELEGRAM_BOT_URL })}</div>
${a11yDialogHTML(t)}${accHref ? `<script type="module" src="${accHref}"></script>` : ""}</body></html>`;
}
