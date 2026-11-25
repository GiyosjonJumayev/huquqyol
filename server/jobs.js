// Davriy vazifalar (soatiga bir marta): muddati tugagan obunalar, eski sessiya va havolalar, to‘lanmagan buyurtmalar, eslatma xatlari.
// Bir nechta nusxa ishlasa ham advisory lock bilan faqat bittasi bajaradi.
import { tx, dbEnabled } from "./db.js";
import { TX_TTL } from "./billing.js";
import { sendMail, mailEnabled } from "./mail.js";
import { fmtDate } from "../public/i18n.js";

export async function runJobs(now = Date.now()){
  if (!dbEnabled()) return null;
  const remind = [];
  const out = await tx(async run => {
    if (!(await run("select pg_try_advisory_xact_lock(724502) as ok")).rows[0].ok) return null;
    const n = async (sql, p = []) => (await run(sql, p)).rowCount;
    const r = {
      subs: await n("update subscriptions set status = 'expired' where status in ('active','trial') and ends_at is not null and ends_at <= now()"),
      sessions: await n("delete from sessions where expires_at <= now()"),
      tokens: await n("delete from user_tokens where expires_at <= now()"),
      tx: 0, orders: 0
    };
    for (const [p, ttl] of Object.entries(TX_TTL)) r.tx += await n("update pay_tx set state = -1, reason = 4, cancel_time = $2 where provider = $1 and state = 1 and ext_time < $3", [p, now, now - ttl]);
    // 14 kun to‘lanmagan obuna buyurtmasi yopiladi (komissiya va kelishuv narxi kutayotgan tashkilot buyurtmasi qoladi)
    r.orders = await n(`update payments p set status = 'cancelled' where status = 'pending' and kind = 'subscription' and amount > 0 and created_at < now() - interval '14 days'
      and not exists(select 1 from pay_tx t where t.payment_id = p.id and t.state = 1)`);
    await run("update subscriptions s set status = 'cancelled' where status = 'pending' and not exists(select 1 from payments p where p.subscription_id = s.id and p.status = 'pending')");
    if (mailEnabled() && process.env.PUBLIC_HOST){
      remind.push(...(await run(`update subscriptions s set reminded_at = now() from users u where u.id = s.user_id and s.status = 'active' and s.reminded_at is null
        and s.ends_at between now() and now() + interval '5 days' returning u.email, s.ends_at, s.plan`)).rows);
    }
    await run("delete from audit_log where at < now() - interval '3 years'");
    return r;
  });
  for (const x of remind) await sendMail(x.email, "renew", { vars: { date: fmtDate(new Date(x.ends_at), "uz") }, link: `https://${process.env.PUBLIC_HOST}/tariflar` });
  return out;
}
let timer = null;
export function startJobs(){
  const go = () => runJobs().catch(e => console.error("[jobs]", e.message));
  setTimeout(go, 15_000).unref();
  timer = setInterval(go, 3600e3); timer.unref();
}
export const stopJobs = () => clearInterval(timer);
