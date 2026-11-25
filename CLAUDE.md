# CLAUDE.md — HuquqYo‘l

Context for Claude working in this repo. Read fully before changing code.

## What this is
Citizen legal-help web app for Uzbekistan, entered in a government LexHackathon.
User describes a problem (text/voice, uz-Latin / uz-Cyrillic / ru) → app classifies it into one of 24 scenarios →
builds a plan (law articles with lex.uz links, deadline per Labour Code art. 9, steps, offices, evidence, calculator) →
generates a ready application/complaint/claim (DOCX/PDF).

**Core principle (do not break):** the LLM only classifies text and extracts facts. Deadlines, money, and document
text come from code + verified templates. The app must work fully with no API key (BM25 + rules mode).

## Competition decision
- Track: **1 — «Huquqiy xizmatlarni ko‘rsatish»** (legal services).
- Problems we target: **#1** citizens can't make official appeals (ariza, taklif, shikoyat) to state bodies;
  **#3** mediation is used in only ~8% of cases.
- Not targeting: #2 notary info, #4 access to one's own official documents.
- Competitor to address in pitch: Ministry of Justice **LexAI** (Q&A chatbot). Our line: *"LexAI answers questions. HuquqYo‘l finishes the case."*

## Run
```bash
npm ci
cp .env.example .env     # Windows: copy .env.example .env ; set NODE_ENV=development, TRUST_PROXY= (empty)
npm run dev              # http://localhost:3000 (auto-restart)
npm test                 # node:test, must stay green (175 tests; 17 DB tests skip without TEST_DATABASE_URL)
npm run test:e2e         # 15 browser tests incl. axe and navbar overlap per role; npm i --no-save playwright && npx playwright install chromium (or CHROME_PATH=…)
npm run bot              # Telegram bot (long polling); needs TELEGRAM_BOT_TOKEN in .env
npm run kb               # rebuild server/kb/*.json from scripts/*.py (Windows: python scripts/build-kb.py server/kb)
```
`/api/health` → `"ai": true` when `ANTHROPIC_API_KEY` is set, `"ocr": true` when Tesseract is enabled.

Env (see `.env.example`): `ANTHROPIC_API_KEY` (optional), `DATABASE_URL` (PostgreSQL; empty → accounts/catalog
DB features return 503, citizen flow still works), `ADMIN_EMAILS` (comma list; users registered with these e-mails
become admin), `AI_PROVIDER` (anthropic|gemini; default = whichever key is set, anthropic first), `GEMINI_API_KEY`,
`GEMINI_MODEL` (default gemini-4-hydrogen), `GEMINI_THINKING` (default lowest level), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_URL` (footer link), `TZ=Asia/Tashkent`, `HOLIDAYS_EXTRA`, `OCR=0` to disable OCR, `TEST_DATABASE_URL` (DB tests; DB is wiped).

## Architecture (v3.14)
- `app.cjs` → `server/index.js` (Express 5). At startup it pre-renders `public/index.html` once per language
  (uz, cyr, ru) by replacing `{{key}}` from `public/i18n.js`, domain cards, and embedded meta JSON. Assets versioned `?v=hash`.
- Frontend: `public/app.js` — vanilla ES modules, 3 screens (Situation → Plan → Application). No framework.
- Shared UI in `public/shared.js` (server + browser), used by the home page and every server page:
  `siteNav` (navbar, mobile menu, account state), `siteFooter` (disclaimer, «Normalar … tekshirilgan», links incl.
  Maxfiylik and Telegram bot — `TELEGRAM_BOT_URL` constant/env, TODO), `a11yDialogHTML` («Aa Qulaylik» modal).
  `public/a11y.js` `mountA11y()` drives the modal: 4 font sizes (`hy_fs` cookie), read aloud, light/dark (`hy_theme` cookie).
  One type scale: server pages reuse the home classes/sizes — don't reuse home-only classes like `.big`/`.how` for other things.
- Server-rendered pages use `page()` in `server/business.js` (+ `statsPage.js`): `/yuristlar`, `/yuristlar/:id`,
  `/tariflar`, `/kabinet`, `/kirish`, `/royxat`, `/hisob`, `/yurist-bolish` (citizen's lawyer application), `/hisob/profil`, `/hisob/statistika`, `/admin`, `/statistika`, `/maxfiylik`.
  Client scripts for them: `public/account.js` (forms → JSON API), `public/kabinet.js` (Pro cabinet).
- Accounts: PostgreSQL (`server/db.js` pool + migrations, `server/auth.js` scrypt passwords, HttpOnly session cookie,
  roles citizen / lawyer / org / moderator / admin).
- **Access control — single source of truth: `server/access.js`** (route → roles, `need: "pro"`, `ADMIN_SECTIONS`,
  `ADMIN_ACTS`, `HOME`). One middleware enforces it on every page and /api route: guest → `/kirish?next=…` (pages) / 401 (API),
  wrong role → friendly 403 page (link to the role's home), missing Pro → `/tariflar` / 402. Admin has no bypass: no
  `/kabinet`, no lawyer editor, no citizen cabinet. Moderator: `/admin` only «yurist» and «rasm». Every new route must be
  added to the matrix — `test/access.test.js` fails otherwise. The navbar only hides links (`navFor(role)`, `/api/me.nav`). `server/accountPages.js` — login, register, «Hisobim», admin dashboard.
- Lawyers: `server/market.js` (catalog, consultations → agreement model, commission), `server/lawyer.js` (profile, photo,
  stats), `server/lawyerPages.js` (profile editor, lawyer stats). Catalog lists Pro lawyers + `demo:true` sample profiles.
- Practice areas («Yo‘nalishim», `/kabinet#yonalish`): `scripts/kb_practice.py` → `server/kb/practice.json` (acts with lex.uz id, number, date;
  pro document templates uz+ru with `{{key}}` fields; checklists) + admin-added acts (`practice_acts`, `/admin?b=baza`, official URLs only).
  `server/practice.js` (`GET /api/practice`, counts), `public/practice.js` (dynamic UI, autofill, live preview), `POST /api/lawyer/areas`.
  New acts: check title, number, date and «amalda» status on lex.uz first; templates must not contain article numbers.
- Lawyer photo: `public/cropper.js` (drag/zoom/rotate → 480 px JPEG); works before the profile is filled (draft profile: empty phone, not in moderation).
- **Payments (v4): `server/billing.js`** is the only place that changes money state (`settle` / `reverse`, row-locked, idempotent, audited);
  `server/payGateways.js` = Payme Merchant API + Click SHOP API webhooks (`/api/pay/*`, mounted before the JSON/same-origin layer). Protocol tests: `test/payments.test.js`.
  Never trust amounts from the browser; never log keys. Setup guide: `docs/PAYMENTS.md`. Prices/discounts/seats come from env.
- Account security: `server/account.js`, `server/totp.js` (2FA), `server/mail.js` (SMTP; off without `SMTP_URL`), page `/xavfsizlik`. Teams: `server/team.js` (`/jamoa`, shared cabinet with versions). Hourly jobs: `server/jobs.js`.
- Production: `deploy/compose.yml` (Caddy, PostgreSQL, backups), `npm run check`, `npm run admin`. Demo lawyers are hidden when NODE_ENV=production unless `SHOW_DEMO=1`.
- Plans: `/tariflar` (Fuqaro free, Yurist Pro, Firma, Tashkilot). Checkout `/tolov/:id`; admin can also confirm bank transfers.
- Courts by district: `server/kb/courts.json` (+ `public/courts.js`, `GET /api/courts`).
- Photo/PDF reading: `server/photo.js` + `server/ocr.js` (Tesseract, no AI needed) + `server/docparse.js` (rules);
  PDFs parsed in the browser with pdf.js (self-hosted). Claude vision is used only when an API key is set.
- Telegram bot: `bot/` (grammY, long polling, imports the engine directly, sessions in memory, never logs user text).
- API: `POST /api/analyze` · `/api/plan` · `/api/document/preview|docx|pdf` · `/api/photo` · `/api/auth/*` · `/api/subscriptions`
  · `/api/consultations` · `/api/lawyer/*` · `/api/cabinet` · `/api/admin/*` · `GET /api/meta|health|stats|courts|me`.
- `server/analyze.js` — AI call behind one `aiComplete()` (Anthropic SDK or Gemini REST via fetch, key only in the
  `x-goog-api-key` header), JSON, prompt-injection guard, norm ids filtered to retrieved set; any error / 10 s timeout → rules.
  `server/photo.js` vision uses the same switch. `node scripts/eval-ai.mjs` compares AI vs rules on the test samples (not in npm test).
- `server/rag.js` — BM25 over norms + scenarios, keyword hits, synonym expansion.
- `server/plan.js` — deadlines, risk, calculators (`CALCS`). `server/dates.js` + `server/holidays.js` — date math (MK art. 9, holidays).
- `server/documents.js` — template engine (`{{key}}`, `[?key]…[/]`, `[!key]…[/]`) → block model → DOCX/PDF.
- `server/validate.js` — per-scenario field spec validation. `server/security.js` — CSP, origin check, rate limit.
- Knowledge base: **source of truth is `scripts/build-kb.py`** (+ `kb_ru.py`, `kb_evidence.py`, `kb_offices.py`).
  Never hand-edit `server/kb/*.json`; edit the Python, run `npm run kb`, then `npm test`.
- **Design v3 «iliq, insoniy»** (spec: `docs/design/home-v3-reference.html`, implemented with our CSS — no inline styles):
  tokens on `:root` in `public/app.css` (paper #FBF7EF, card #FFFDF8, border #E6DAC4, ink #2A2420, green #1E5B52,
  saffron, terracotta, olive, danger #B42318/#FEF3F2; warm dark theme). Fonts self-hosted via @fontsource: Spectral
  (headings, italic accent), Onest (body), Caveat (handwritten accent — max 3 uses on the home page, never body text).
  Pill buttons, 18–22px cards, shadow only on the main input, ikat strip on the input card and footer.
  Copy tone: plain, warm, short sentences, «siz», no jargon. `test/design.test.js` checks fonts are local.
- Cyrillic output is auto-transliterated from uz-Latin (`public/translit.js`). Russian is a separate overlay (`ru.json`), must stay structurally in sync.

## Open issues
Done and verified: MK 333 literal calculator, public holidays (MK 9), MK 558/560/562 citations, `TZ=Asia/Tashkent`.
1. **Hosting for demo:** Render free plan sleeps (cold start) and has ephemeral disk (stats reset). Use a VPS or paid instance
   (also needed for PostgreSQL).
2. 7 norms have no article number (banking law, MJtK 10-day appeal) — fill only from lex.uz original text.
3. Fact extraction misses USD amounts ("500 dollar") — common for rent deposits and migrant agency fees.
4. Data: AI mode sends citizen text to Anthropic (US). Uzbek personal-data law has localization rules and the Ministry of
   Justice registered AI ethics rules (No. 3787, 14.03.2026). Position rules-only mode (+ local OCR) as the government deployment default.
5. Payments need real merchant contracts and keys (owner). `/oferta` text and templates need a lawyer's review before launch.
6. Sample lawyers (`demo:true`) must always be visibly marked DEMO; remove them before a real launch.

Verified still correct: CB rate 14% (kept 2026-11-04; next meeting 2026-12-16), minimum alimony 360 400 so‘m from 2026-09-01.

## Roadmap (remaining)
Done: general appeal builder (`murojaat_umumiy`: ariza/taklif/shikoyat), mediation step + letter (MK 560 pause for labour only),
Telegram bot (long polling), accounts, lawyer catalog + Pro cabinet, plans, OCR.
1. **Guided chat mode** — user writes freely; AI asks only for missing fields (from scenario `fields` spec), one question at a time;
   output is the same deterministic plan + document. Button-driven fallback without API key. NOT a free-form legal chatbot.
2. Bot: opt-in deadline reminders (store only chat_id + date, never case text); HTTPS webhook for production.
3. Pitch/demo update around Track 1 problems #1 and #3 + LexAI comparison slide.

## Rules for changes
- Legal content: every norm needs an official source (lex.uz preferred). Never invent article numbers or formulas.
  Flag any legal change for human review in the PR description.
- Keep uz and ru in sync; run `npm run kb` + `npm test` after any KB change.
- Keep CSP strict: no inline scripts/styles, no external CDNs.
- No new dependencies without a clear reason.
- Work on a branch; small commits; tests green before every commit.
