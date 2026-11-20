// Kalendar fayli (.ics) — saytdagi eksport (public/app.js, downloadIcs) bilan bir xil tarkib:
// oxirgi kun + 3 kun oldingi eslatma (agar u hali o‘tmagan bo‘lsa), har birida 15 soat oldin signal.
const icsEsc = s => String(s).replace(/[\\;,]/g, m => "\\" + m).replace(/\r?\n/g, "\\n");
const icsDate = s => s.replace(/-/g, "");
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shift = (day, n) => { const x = new Date(day + "T00:00:00"); x.setDate(x.getDate() + n); return iso(x); };
// RFC 5545: qator 75 baytdan oshmasin
const fold = line => { const out = []; let cur = "", n = 0; for (const ch of line){ const b = Buffer.byteLength(ch); if (n + b > 73){ out.push(cur); cur = " "; n = 1; } cur += ch; n += b; } out.push(cur); return out.join("\r\n"); };

export function buildIcs(p, t, { today = new Date(), siteUrl = "", now = new Date() } = {}){
  if (!p?.deadline) return null;
  const desc = [p.info.lead, "", ...p.steps.map((s, i) => `${i + 1}. ${s.org}: ${s.t} (${s.when})`), ...(siteUrl ? ["", siteUrl] : [])].join("\n");
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const ev = (uid, day, title) => ["BEGIN:VEVENT", `UID:${uid}-${p.scenario}-${day}@huquqyol`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(day)}`, `DTEND;VALUE=DATE:${icsDate(shift(day, 1))}`, `SUMMARY:${icsEsc(title)}`, `DESCRIPTION:${icsEsc(desc)}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(title)}`, "TRIGGER:-PT15H", "END:VALARM", "END:VEVENT"];
  const soon = shift(p.deadline, -3);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HuquqYo‘l//UZ", "CALSCALE:GREGORIAN",
    ...(soon >= iso(today) ? ev("soon", soon, t("calSoon", { title: p.info.title })) : []),
    ...ev("last", p.deadline, t("calTitle", { title: p.info.title })), "END:VCALENDAR"];
  return lines.map(fold).join("\r\n") + "\r\n";
}
