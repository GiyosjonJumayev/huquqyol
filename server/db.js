// PostgreSQL: hisoblar, obunalar, to‘lovlar, yuristlar va kelishuvlar (konsultatsiyalar).
// DATABASE_URL bo‘lmasa — sayt avvalgidek ishlaydi (fuqaro oqimi bazasiz), hisob funksiyalari 503 qaytaradi.
// Migratsiyalar ilova ishga tushganda avtomatik qo‘llanadi (schema_migrations jadvali bo‘yicha).
import pg from "pg";

const MIGRATIONS = [
  // 1 — asosiy jadvallar
  `create table users(
     id bigserial primary key,
     email text not null,
     phone text,
     name text not null,
     password_hash text not null,
     role text not null default 'citizen' check (role in ('citizen','lawyer','org','admin')),
     org_id bigint,
     failed_logins int not null default 0,
     locked_until timestamptz,
     last_login_at timestamptz,
     created_at timestamptz not null default now());
   create unique index users_email_uq on users (lower(email));

   create table organizations(
     id bigserial primary key,
     name text not null,
     kind text not null default 'korxona' check (kind in ('korxona','muassasa','firma','byuro','boshqa')),
     inn text,
     created_by bigint references users(id) on delete set null,
     created_at timestamptz not null default now());
   alter table users add constraint users_org_fk foreign key (org_id) references organizations(id) on delete set null;

   create table sessions(
     id text primary key,                       -- sha256(token): token faqat cookie da
     user_id bigint not null references users(id) on delete cascade,
     created_at timestamptz not null default now(),
     expires_at timestamptz not null,
     ip text, ua text);
   create index sessions_user on sessions(user_id);

   create table subscriptions(
     id bigserial primary key,
     user_id bigint not null references users(id) on delete cascade,
     org_id bigint references organizations(id) on delete set null,
     plan text not null check (plan in ('pro','firma','org')),
     status text not null check (status in ('trial','pending','active','cancelled','expired')),
     price bigint not null default 0,           -- oylik narx, so‘m
     started_at timestamptz not null default now(),
     ends_at timestamptz,
     created_at timestamptz not null default now());
   create index subscriptions_user on subscriptions(user_id);

   create table lawyer_profiles(
     id bigserial primary key,
     user_id bigint unique references users(id) on delete set null,
     status text not null default 'pending' check (status in ('pending','approved','rejected')),
     kind text not null default 'yurist' check (kind in ('advokat','yurist','firma','mediator')),
     name text not null, firm text, license text, region text, district text,
     phone text not null, email text,
     areas text[] not null default '{}', formats text[] not null default '{}', langs text[] not null default '{}',
     experience int not null default 0, price bigint not null default 0,
     headline text, about text,
     created_at timestamptz not null default now(),
     reviewed_at timestamptz, reviewed_by bigint references users(id) on delete set null, review_note text);

   create table consultations(
     id bigserial primary key,
     lawyer_id bigint not null references lawyer_profiles(id) on delete cascade,
     citizen_id bigint not null references users(id) on delete cascade,
     scenario text, domain text,
     format text not null default 'online' check (format in ('online','office')),
     message text not null,
     status text not null default 'requested' check (status in ('requested','offered','agreed','completed','declined','cancelled')),
     offer_price bigint, offer_note text, offer_at timestamptz,
     commission_pct numeric(5,2) not null default 10,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now());
   create index consultations_lawyer on consultations(lawyer_id);
   create index consultations_citizen on consultations(citizen_id);

   create table payments(
     id bigserial primary key,
     user_id bigint references users(id) on delete set null,
     subscription_id bigint references subscriptions(id) on delete set null,
     consultation_id bigint references consultations(id) on delete set null,
     kind text not null check (kind in ('subscription','commission')),
     amount bigint not null check (amount >= 0),
     status text not null default 'pending' check (status in ('pending','paid','refunded','cancelled')),
     method text,
     note text,
     paid_at timestamptz,
     created_at timestamptz not null default now());
   create index payments_paid on payments(paid_at) where status = 'paid';

   create table lawyer_events(
     id bigserial primary key,
     lawyer_ref text not null,                  -- 'db:12' yoki namuna profil id si
     kind text not null check (kind in ('view','request')),
     domain text, scenario text,
     created_at timestamptz not null default now());
   create index lawyer_events_ref on lawyer_events(lawyer_ref, kind);`,
  // 2 — yurist profili (rasm, ta’lim, xizmatlar, aloqa) va Yurist Pro kabineti ma’lumotlari (hisobda saqlanadi)
  `alter table lawyer_profiles
     add column photo bytea, add column photo_type text, add column photo_at timestamptz,
     add column education text, add column achievements text, add column address text, add column hours text,
     add column telegram text, add column website text, add column license_issuer text,
     add column services jsonb not null default '[]'::jsonb,
     add column updated_at timestamptz not null default now();
   create table cabinet_data(
     user_id bigint primary key references users(id) on delete cascade,
     data jsonb not null,
     updated_at timestamptz not null default now());
   create index lawyer_events_day on lawyer_events(lawyer_ref, created_at);`,
  // 3 — moderator roli (yurist arizalari va rasm moderatsiyasi) va rasm tekshirilgan vaqt
  `alter table users drop constraint if exists users_role_check;
   alter table users add constraint users_role_check check (role in ('citizen','lawyer','org','moderator','admin'));
   alter table lawyer_profiles add column photo_reviewed_at timestamptz;`,
  // 4 — admin qo‘shadigan normativ hujjatlar (yurist yo‘nalishlari kutubxonasi)
  `create table practice_acts(
     id bigserial primary key,
     type text not null, title_uz text not null, title_ru text, num text, act_date date,
     url text not null unique, areas text[] not null,
     created_by bigint references users(id) on delete set null,
     created_at timestamptz not null default now());`
];

let pool = null;
export const dbEnabled = () => !!pool;
export function initDb(url = process.env.DATABASE_URL){
  if (!url) return null;
  pool = new pg.Pool({ connectionString: url, max: Number(process.env.DB_POOL || 10),
    ssl: /sslmode=require/.test(url) || process.env.DB_SSL === "1" ? { rejectUnauthorized: process.env.DB_SSL_STRICT === "1" } : undefined });
  pool.on("error", e => console.error("[db]", e.message));
  return pool;
}
export async function closeDb(){ if (pool){ const p = pool; pool = null; await p.end(); } }

export async function q(text, params = []){
  if (!pool) throw Object.assign(new Error("db"), { status: 503, key: "dbOff" });
  return pool.query(text, params);
}
export const one = async (text, params) => (await q(text, params)).rows[0] || null;
export async function tx(fn){
  if (!pool) throw Object.assign(new Error("db"), { status: 503, key: "dbOff" });
  const c = await pool.connect();
  try { await c.query("begin"); const r = await fn((t, p) => c.query(t, p)); await c.query("commit"); return r; }
  catch (e){ await c.query("rollback").catch(() => {}); throw e; }
  finally { c.release(); }
}

// Migratsiyalar: bir nechta nusxa bir vaqtda ishga tushsa ham — advisory lock bilan bittasi bajaradi
export async function migrate(){
  if (!pool) return 0;
  return tx(async run => {
    await run("select pg_advisory_xact_lock(724501)");
    await run("create table if not exists schema_migrations(version int primary key, applied_at timestamptz not null default now())");
    const done = new Set((await run("select version from schema_migrations")).rows.map(r => r.version));
    let n = 0;
    for (let i = 0; i < MIGRATIONS.length; i++){
      if (done.has(i + 1)) continue;
      await run(MIGRATIONS[i]);
      await run("insert into schema_migrations(version) values ($1)", [i + 1]);
      n++;
    }
    return n;
  });
}
