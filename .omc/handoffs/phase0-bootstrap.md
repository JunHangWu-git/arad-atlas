# Handoff: Phase 0 (Bootstrap) → Phase 1 (Neople API client)

**Status:** Phase 0 COMPLETE + committed `a86c34a`. Gate all green.

## Done
- Next.js 16.2.6 App Router + TS + Tailwind v4 scaffold (`app/`, `components/`, `lib/`)
- Drizzle ORM + libSQL `db/schema.ts` — 9 tables (characters, fame/gear/status_snapshot, item/job/skill_cache, guide_cache, snapshot_lock)
- Migration `drizzle/migrations/0000_melted_johnny_blaze.sql` generated (NOT yet applied to a db file)
- shadcn/ui base comps (button, card, table, dialog, input, badge, skeleton) + deps (cvar, radix-slot, radix-dialog, tailwind-merge, clsx, tailwindcss-animate)
- `scripts/hash-passphrase.ts`, `.env.example`, vitest (1 sanity test passing)

## Gate results
- `npx tsc --noEmit` ✓ | `npm test` ✓ | `npm run build` ✓ | `npm run db:generate` ✓
- Security grep ✓ — DFO_API_KEY literal/var/`apikey=` NOT in `.next`

## Decisions / gotchas (carry forward)
- **vitest config MUST be `.mts`** — project is CommonJS; `vitest.config.ts` loaded via require() → `ERR_REQUIRE_ESM` on std-env. Do not rename back.
- **npm install on `/mnt/e` (Windows drive) is very slow + gets reaped if backgrounded.** Run installs FOREGROUND in a plain terminal, let finish fully. Never `pkill -f "npm install"` while a good one runs.
- **DFO_API_KEY** lives in `../DFO_API_KEY.txt` (outside repo). Copy into `.env.local` only. server-only, never NEXT_PUBLIC, never log, never commit.
- **Never `drizzle-kit push`** — use generate + migrate (push destroys data).
- Turso + Vercel infra DEFERRED to Phase 7 (local-first `file:./data.db` for now).
- `.env.local` + `data.db` gitignored — confirmed.

## Next: Phase 1 — Neople API client (plan: `.omc/plans/dfo-character-tracker.md`)
3-worker decomposition per File-Ownership Matrix:
- **A**: API client + Zod schemas + rate limiter + fixtures
- **B**: server fns (servers/characters/portrait)
- **C**: items/jobs caches + tests
Every Neople helper starts with `import "server-only"`. Fixture-driven Zod schema derivation. Pause at gate before Phase 2.

## Guide feature (deferred v1.1)
RAG over scraped/imported guides, NOT trained model. Sources: dfo.gg, dfoworld.kr, + Nick's Google Sheets (in auto-memory). libSQL vector cols.
