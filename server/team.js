// Jamoa (Firma va Tashkilot tariflari): a’zolarni taklif qilish, o‘rinlar soni, umumiy kartoteka (org_cabinet).
import { q, one, tx } from "./db.js";
import { clean, ValidationError } from "./validate.js";
import { SEATS, audit } from "./billing.js";
import { issueToken, peekToken, takeToken } from "./account.js";
import { sendMail, siteUrl } from "./mail.js";

const err = (key, status = 400, vars) => Object.assign(new ValidationError(key, vars), { status });
/** Jamoaning faol tarifi (egasi to‘lagan Firma / Tashkilot obunasi). */
export const teamPlan = (orgId, run = q) => orgId ? run(`select plan, status, ends_at from subscriptions where org_id = $1 and plan in ('firma','biznes','org') and status in ('active','trial')
  and (ends_at is null or ends_at > now()) order by (status = 'active') desc limit 1`, [orgId]).then(r => r.rows[0] || null) : null;
export async function teamInfo(user){
  if (!user.org_id) return null;
  const [org, plan, members, invites] = await Promise.all([one("select id, name, kind, inn from organizations where id = $1", [user.org_id]), teamPlan(user.org_id),
    q("select id, name, email, org_role from users where org_id = $1 order by (org_role = 'owner') desc, name", [user.org_id]).then(r => r.rows.map(m => ({ ...m, id: Number(m.id) }))),
    q("select left(id, 16) as ref, data->>'email' as email, expires_at from user_tokens where kind = 'invite' and (data->>'org')::bigint = $1 and expires_at > now() order by created_at desc", [user.org_id]).then(r => r.rows)]);
  return { org, plan: plan?.plan || null, seats: plan ? SEATS[plan.plan] : 0, members, invites, owner: user.org_role === "owner" };
}
const ownerOnly = req => { if (!req.user.org_id || req.user.org_role !== "owner") throw err("forbidden", 403); };

export async function invite(req, res){
  ownerOnly(req);
  const email = clean(req.body?.email, 254).toLowerCase();
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email)) throw err("email");
  const t = await teamInfo(req.user);
  if (!t.plan) throw err("needTeam", 402);
  if (t.members.some(m => m.email.toLowerCase() === email)) throw err("alreadyMember", 409);
  if (t.members.length + t.invites.filter(i => i.email !== email).length >= t.seats) throw err("seats", 409, { n: t.seats });
  await q("delete from user_tokens where kind = 'invite' and (data->>'org')::bigint = $1 and data->>'email' = $2", [req.user.org_id, email]);
  const tok = await issueToken("invite", { userId: req.user.id, hours: 24 * 7, data: { org: req.user.org_id, email } });
  const path = `/jamoa/taklif?t=${tok}`, base = siteUrl(req);
  const sent = base ? await sendMail(email, "invite", { lang: req.lang, vars: { org: t.org.name }, link: base + path }) : false;
  await audit(q, { userId: req.user.id, action: "team.invite", target: `org:${req.user.org_id}`, ip: req.ip });
  res.status(201).json({ ok: true, sent, link: path });                     // SMTP bo‘lmasa havola egasiga ko‘rsatiladi
}
export async function cancelInvite(req, res){
  ownerOnly(req);
  if (!/^[0-9a-f]{16}$/.test(req.params.ref)) throw err("notFound", 404);
  await q("delete from user_tokens where kind = 'invite' and left(id, 16) = $1 and (data->>'org')::bigint = $2", [req.params.ref, req.user.org_id]);
  res.json({ ok: true });
}
export async function inviteView(token){
  const t = await peekToken("invite", token);
  return t ? { email: t.data.email, org: await one("select name from organizations where id = $1", [t.data.org]) } : null;
}
export async function acceptInvite(req, res){
  await tx(async run => {
    const t = await takeToken(run, "invite", req.body?.token);
    if (!t) throw err("badLink");
    if (t.data.email !== req.user.email.toLowerCase()) throw err("inviteEmail", 403);
    const org = (await run("select id from organizations where id = $1 for update", [t.data.org])).rows[0];
    const plan = org && await teamPlan(org.id, run);
    if (!plan) throw err("needTeam", 402);
    const u = (await run("select org_id, org_role, role from users where id = $1 for update", [req.user.id])).rows[0];
    if (!["citizen", "lawyer", "org"].includes(u.role)) throw err("forbidden", 403);
    if (u.org_id && Number(u.org_id) !== Number(org.id)){
      const n = (await run("select count(*)::int n from users where org_id = $1 and id <> $2", [u.org_id, req.user.id])).rows[0].n;
      if (u.org_role === "owner" && n > 0) throw err("ownTeam", 409);                  // jamoasi bor egani ko‘chirib bo‘lmaydi
    }
    if ((await run("select count(*)::int n from users where org_id = $1 and id <> $2", [org.id, req.user.id])).rows[0].n >= SEATS[plan.plan]) throw err("seats", 409, { n: SEATS[plan.plan] });
    // E-pochta bu yerda tasdiqlanmaydi: taklif havolasi egasiga ham ko‘rinadi, demak pochta egaligini isbotlamaydi (ADMIN_EMAILS himoyasi)
    await run("update users set org_id = $2, org_role = 'member', role = case when role = 'citizen' then $3 else role end where id = $1", [req.user.id, org.id, ["org", "biznes"].includes(plan.plan) ? "org" : "lawyer"]);
    await audit(run, { userId: req.user.id, action: "team.join", target: `org:${org.id}`, ip: req.ip });
  });
  res.json({ ok: true, next: "/jamoa" });
}
export async function removeMember(req, res){
  const id = Number(req.params.id);
  if (id !== req.user.id) ownerOnly(req);                                     // a’zo o‘zi chiqib ketishi mumkin
  const r = await q("update users set org_id = null, org_role = null where id = $1 and org_id = $2 and org_role = 'member'", [Number.isSafeInteger(id) ? id : 0, req.user.org_id]);
  if (!r.rowCount) throw err("notFound", 404);
  await audit(q, { userId: req.user.id, action: "team.remove", target: `user:${id}`, ip: req.ip });
  res.json({ ok: true });
}

// ---------- Umumiy kartoteka: versiya bilan (ikki kishi bir vaqtda yozsa — 409, brauzer birlashtirib qayta yuboradi) ----------
const needTeam = async req => { if (!req.user.org_id || !await teamPlan(req.user.org_id)) throw err("needTeam", 402); };
export async function getTeamCabinet(req, res){
  await needTeam(req);
  const [r, members] = await Promise.all([one("select data, version, updated_at from org_cabinet where org_id = $1", [req.user.org_id]), q("select id, name from users where org_id = $1 order by name", [req.user.org_id])]);
  res.set("Cache-Control", "private, no-store").json({ data: r?.data || null, version: r?.version || 0, updatedAt: r?.updated_at || null, members: members.rows.map(m => ({ id: String(m.id), name: m.name })) });
}
export async function putTeamCabinet(req, res){
  await needTeam(req);
  const d = req.body?.data, v = Number(req.body?.version);
  if (!d || typeof d !== "object" || Array.isArray(d) || d.v !== 1 || !Number.isInteger(v) || v < 0) throw err("badJson");
  const json = JSON.stringify(d);
  if (json.length > 900_000) throw err("tooLarge", 413);
  const r = v === 0
    ? await one("insert into org_cabinet(org_id, data, version, updated_by) values ($1, $2::jsonb, 1, $3) on conflict (org_id) do nothing returning version, updated_at", [req.user.org_id, json, req.user.id])
    : await one("update org_cabinet set data = $2::jsonb, version = version + 1, updated_at = now(), updated_by = $3 where org_id = $1 and version = $4 returning version, updated_at", [req.user.org_id, json, req.user.id, v]);
  if (!r) throw err("conflict", 409);
  res.json({ ok: true, version: r.version, updatedAt: r.updated_at });
}
