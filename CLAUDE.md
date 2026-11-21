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
npm test                 # node:test, must stay green (145 tests; 3 DB tests skip without TEST_DATABASE_URL)
npm run test:e2e         # 13 browser tests incl. axe; npm i --no-save playwright && npx playwright install chromium (or CHROME_PATH=…)
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
  `/tariflar`, `/kabinet`, `/kirish`, `/royxat`, `/hisob`, `/hisob/profil`, `/hisob/statistika`, `/admin`, `/statistika`, `/maxfiylik`.
  Client scripts for them: `public/account.js` (forms → JSON API), `public/kabinet.js` (Pro cabinet).
- Accounts: PostgreSQL (`server/db.js` pool + migrations, `server/auth.js` scrypt passwords, HttpOnly session cookie,
  roles citizen / lawyer / org / admin). `server/accountPages.js` — login, register, «Hisobim», admin dashboard.
- Lawyers: `server/market.js` (catalog, consultations → agreement model, commission), `server/lawyer.js` (profile, photo,
  stats), `server/lawyerPages.js` (profile editor, lawyer stats). Catalog lists Pro lawyers + `demo:true` sample profiles.
- Plans: `/tariflar` (Fuqaro free, Yurist Pro, Firma, Tashkilot). No payment gateway: admin confirms payment manually in `/admin`.
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
- Cyrillic output is auto-transliterated from uz-Latin (`public/translit.js`). Russian is a separate overlay (`ru.json`), must stay structurally in sync.

## Open issues
Done and verified: MK 333 literal calculator, public holidays (MK 9), MK 558/560/562 citations, `TZ=Asia/Tashkent`.
1. **Hosting for demo:** Render free plan sleeps (cold start) and has ephemeral disk (stats reset). Use a VPS or paid instance
   (also needed for PostgreSQL).
2. 7 norms have no article number (banking law, MJtK 10-day appeal) — fill only from lex.uz original text.
3. Fact extraction misses USD amounts ("500 dollar") — common for rent deposits and migrant agency fees.
4. Data: AI mode sends citizen text to Anthropic (US). Uzbek personal-data law has localization rules and the Ministry of
   Justice registered AI ethics rules (No. 3787, 14.03.2026). Position rules-only mode (+ local OCR) as the government deployment default.
5. Payments: no Click/Payme yet — subscriptions are confirmed manually by an admin.
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
