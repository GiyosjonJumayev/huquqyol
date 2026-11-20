# CLAUDE.md — HuquqYo‘l

Context for Claude working in this repo. Read fully before changing code.

## What this is
Citizen legal-help web app for Uzbekistan, entered in a government LexHackathon.
User describes a problem (text/voice, uz-Latin / uz-Cyrillic / ru) → app classifies it into one of 23 scenarios →
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
npm test                 # node:test, must stay green (66 tests)
npm run test:e2e         # optional: npm i --no-save playwright && npx playwright install chromium
npm run kb               # rebuild server/kb/*.json from scripts/*.py (Windows: python scripts/build-kb.py server/kb)
```
`/api/health` → `"ai": true` when `ANTHROPIC_API_KEY` is set.

## Architecture
- `app.cjs` → `server/index.js` (Express 5). At startup it pre-renders `public/index.html` once per language
  (uz, cyr, ru) by replacing `{{key}}` from `public/i18n.js`, domain cards, and embedded meta JSON. Assets versioned `?v=hash`.
- Frontend: `public/app.js` — vanilla ES modules, 3 screens (Situation → Plan → Application). No framework.
- API: `POST /api/analyze` (classify) · `POST /api/plan` · `POST /api/document/preview|docx|pdf` · `GET /api/meta|health|stats`.
- `server/analyze.js` — Claude call (JSON, prompt-injection guard, norm ids filtered to retrieved set) with rules fallback.
- `server/rag.js` — BM25 over norms + scenarios, keyword hits, synonym expansion.
- `server/plan.js` — deadlines, risk, calculators (`CALCS`). `server/dates.js` — date math (MK art. 9).
- `server/documents.js` — template engine (`{{key}}`, `[?key]…[/]`, `[!key]…[/]`) → block model → DOCX/PDF.
- `server/validate.js` — per-scenario field spec validation. `server/security.js` — CSP, origin check, rate limit.
- Knowledge base: **source of truth is `scripts/build-kb.py`** (+ `kb_ru.py`, `kb_evidence.py`, `kb_offices.py`).
  Never hand-edit `server/kb/*.json`; edit the Python, run `npm run kb`, then `npm test`.
- Cyrillic output is auto-transliterated from uz-Latin (`public/translit.js`). Russian is a separate overlay (`ru.json`), must stay structurally in sync.

## Known issues (verified 2026-11-20) — fix first
1. **MK 333 calculator is legally wrong (CRITICAL, it's in the main demo).** Art. 333: compensation = **10% of the
   refinancing rate for each day of delay** (no /365). With 14% → 1.4% of debt per day. Code (`plan.js` `compensation`)
   headlines `low = debt × rate / 365 / day`, which matches neither the literal text nor the alternative accountant reading
   (`debt × rate × 10% ÷ 365 × days`). Fix: headline = literal reading; show alternative reading as secondary with a source;
   delete the invented formula. Update texts in `CT.uz/ru` and tests. Demo case (9 mln, 3 months, trigger 2026-08-20,
   today 2026-11-20): literal = 7 728 000; alternative ≈ 21 173; current wrong headline = 211 726.
2. **Public holidays not handled.** MK art. 9: if the last day is a non-working day, the term ends on the next working day.
   `dates.js` only shifts Sundays. Add a holiday list (1 Jan, 8 Mar, 21 Mar, 9 May, 1 Sep, 1 Oct, 8 Dec + movable Ramazon/Qurbon hayit, configurable per year).
3. **Citation:** norms `muddat` and `sud` cite "34-bob" — confirmed as **MK 560-modda** (3 months reinstatement from receipt
   of order copy; 6 months other disputes; term suspended during mediation). Update in `build-kb.py` and `kb_ru.py`.
4. **Time zone:** dates use server local time; on UTC hosts users in Tashkent get "future date" errors 00:00–05:00.
   Set `TZ=Asia/Tashkent` in `Dockerfile`, `render.yaml`, `.env.example`, `deploy/*`.
5. **Hosting for demo:** Render free plan sleeps (cold start) and has ephemeral disk (stats reset). Use a VPS or paid instance.
6. 7 norms have no article number (banking law, MJtK 10-day appeal) — fill only from lex.uz original text.
7. Fact extraction misses USD amounts ("500 dollar") — common for rent deposits and migrant agency fees.
8. Data: AI mode sends citizen text to Anthropic (US). Uzbek personal-data law has localization rules and the Ministry of
   Justice registered AI ethics rules (No. 3787, 14.03.2026). Position rules-only mode as the government deployment default.

Verified still correct: CB rate 14% (kept 2026-11-04; next meeting 2026-12-16), minimum alimony 360 400 so‘m from 2026-09-01.

## Roadmap (in order)
1. Fixes 1–5 above.
2. **General appeal builder** — one scenario for any state body with 3 templates per the Law on Appeals: ariza, taklif, shikoyat.
3. **Mediation** — for labour, consumer, rent, debt scenarios: mediation step in plan + mediation-proposal letter;
   note that the court term is suspended during mediation (MK 560).
4. **Guided chat mode** — user writes freely; AI asks only for missing fields (from scenario `fields` spec), one question at a time;
   output is the same deterministic plan + document. Button-driven fallback without API key. NOT a free-form legal chatbot.
5. **Telegram bot** (grammY, same process, reuse step-4 conversation engine): text → scenario → questions → PDF in chat;
   opt-in deadline reminders (store only chat_id + date, never case text). Needs HTTPS webhook.
6. Pitch/demo update around Track 1 problems #1 and #3 + LexAI comparison slide.

## Rules for changes
- Legal content: every norm needs an official source (lex.uz preferred). Never invent article numbers or formulas.
  Flag any legal change for human review in the PR description.
- Keep uz and ru in sync; run `npm run kb` + `npm test` after any KB change.
- Keep CSP strict: no inline scripts/styles, no external CDNs.
- No new dependencies without a clear reason.
- Work on a branch; small commits; tests green before every commit.
