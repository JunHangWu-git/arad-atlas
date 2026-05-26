# DFO Character Tracker — Work Plan

**Status:** approved 2026-05-26 — team execution
**Owner:** Nick
**Created:** 2026-05-26
**Mode:** direct (interview → plan, non-consensus)
**Remote:** `git@github.com:JunHangWu-git/arad-atlas.git`

---

## Requirements Summary

Personal-use web app to track Dungeon Fighter Online (Global / dfoneople.com) character progression for Nick's own roster.

**In scope:**
- Multi-character roster (manual add by server + char name; auto-resolve via API)
- Gear + stats snapshot (equipment, avatar, creature, talisman/rune-equivalent, mist assimilation, buff gear, status block)
- Fame history graph (daily snapshots → time-series chart)
- Activity timeline (best-effort; pending Global API verification)
- Skills view (skill style + per-class skill metadata from `/df/jobs` + `/df/skills/:jobId`)
- Character looks (composite portrait via `img-api.dfoneople.com`)
- External guide links per class/build (user-supplied URLs stored per character or per class)

**Out of scope (v1):**
- Public/community access
- Auction sniping, market analytics
- Guild dashboards, multi-user auth
- Mobile-native app
- Push notifications

---

## Acceptance Criteria (testable)

1. **Roster add flow:** From `/roster` page, entering `server=cain` + `name=<charName>` resolves via `GET /df/servers/cain/characters?characterName=<name>` and persists `{serverId, characterId, adventureName, jobName, level}` to DB. New row visible on `/roster` within 2s.
2. **Snapshot refresh:** Clicking "Refresh" on a character triggers `POST /api/characters/[id]/refresh`. Returns 200 within 5s p95. DB has fresh rows in `gear_snapshot`, `status_snapshot`, `fame_snapshot` with `captured_at = now()`.
3. **Fame history graph:** `/characters/[id]` page renders line chart of `fame_snapshot.fame` vs `captured_at`. At least 2 distinct points → visible line; 1 point → visible dot.
4. **Daily cron:** Vercel Cron at `0 8 * * *` UTC hits `/api/cron/snapshot-all` which loops registered chars and writes one `fame_snapshot` + one `gear_snapshot` row each. Verified via Vercel cron logs + DB row count delta ≥ N (N = roster size).
5. **Gear panel:** `/characters/[id]/gear` renders all 11 equipment slots + avatars + creature + talisman/rune-equivalent + mist assimilation. Each slot links to `/items/[itemId]` and shows item rarity color.
6. **Portrait:** `/characters/[id]` header shows character portrait via `https://img-api.dfoneople.com/df/servers/{serverId}/characters/{characterId}?zoom=1`. Falls back to placeholder on 404.
7. **Skills view:** `/characters/[id]/skills` renders skill style (from `/skill/style`) joined with class skill metadata (cached from `/skills/:jobId`).
8. **Guide links:** Per-character free-text field for guide URLs; rendered as clickable list. Persisted across refresh.
9. **API key never exposed:** Browser network tab shows zero requests to `api.dfoneople.com`. All Neople calls flow through Next.js Route Handlers. Grep gates (all must return 0 hits):
   - `grep -r "DFO_API_KEY" .next/static .next/server/app .next/server/chunks` (var name)
   - `grep -rF "$(cat ../DFO_API_KEY.txt)" .next/static` (literal key value — catches inliner false-negatives)
   - `grep -rE "apikey=[a-zA-Z0-9]" .next/static` (catches accidental URL-construction in client code)
10. **Rate-limit safe:** Bulk refresh of N chars stays under Neople rate cap. Implementation: sequential calls with 100ms spacing OR `Promise.allSettled` with concurrency-3 limit. Snapshot cron handles ≥ 20 chars without 429.

---

## Tech Stack (decided)

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 15 (App Router) + TypeScript | Server-side API key handling, single codebase, RSC for fast page loads |
| UI | Tailwind v4 + shadcn/ui + lucide-react | Component velocity, dark theme |
| Charts | Recharts | React-native, simple time-series, MIT |
| DB | Turso (libSQL, SQLite-compatible) | Free tier 9GB, zero-ops, edge replicas, works on Vercel |
| ORM | Drizzle | Type-safe, lightweight, libSQL adapter first-class |
| Validation | Zod | Parse Neople responses, fail loud on schema drift |
| HTTP | native `fetch` + tiny retry helper | No axios bloat |
| Cron | Vercel Cron (Hobby: daily allowed) | Free, declarative in `vercel.json` |
| Hosting | Vercel Hobby | Free, git-push deploy, env vars for `DFO_API_KEY` |
| Auth | Single-user passphrase via middleware (env-stored hash) | Personal-use only; no full OAuth needed |

**Why Drizzle over Prisma:** Prisma generates 80MB+ engine binary unfriendly to Vercel cold starts. Drizzle is ~50KB.

**Why Turso over Neon Postgres:** SQLite mental model simpler for personal app; Drizzle migrations trivial; libSQL has Vercel example template.

**Fallback path (option 2 — VPS):** Same code runs on Hetzner / Pi. Swap Turso for local `file:./data.db` libSQL. Cron via `node-cron` started in `instrumentation.ts`. No code rewrite needed.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Next.js client components, RSC pages)         │
│  - No DFO_API_KEY exposure                              │
└──────────────┬──────────────────────────────────────────┘
               │ fetch /api/*
               ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js Route Handlers (app/api/**)                    │
│  - /api/characters       (CRUD roster)                  │
│  - /api/characters/[id]/refresh  (pull from Neople)     │
│  - /api/cron/snapshot-all        (daily cron hook)      │
│  - /api/items/[itemId]           (cached pass-through)  │
│  - /api/jobs, /api/skills/[jobId] (cached metadata)     │
└──┬────────────────────────────────────┬─────────────────┘
   │                                    │
   ▼                                    ▼
┌────────────┐                ┌──────────────────────────┐
│  Turso     │                │ Neople API client        │
│  (libSQL)  │                │  lib/neople/*.ts         │
│            │                │  - apiKey from env       │
│  Drizzle   │                │  - Zod parse responses   │
│  schema/   │                │  - retry on 5xx          │
└────────────┘                │  - cache static lookups  │
                              └──────────┬───────────────┘
                                         │
                                         ▼
                              api.dfoneople.com/df/**
```

---

## Data Model (Drizzle / libSQL)

File: `db/schema.ts`

```ts
// characters: roster
characters {
  id: text primary key (cuid)
  serverId: text not null            // 'cain', 'diregie', ...
  characterId: text not null         // Neople-issued hex
  characterName: text not null
  adventureName: text
  jobId: text
  jobGrowId: text
  jobName: text
  level: integer
  guildName: text
  guideUrls: text                    // JSON-encoded string[]
  createdAt: integer (unix ms)
  updatedAt: integer (unix ms)
  UNIQUE(serverId, characterId)
}

// fame_snapshot: time-series fame
fame_snapshot {
  id: integer primary key autoincrement
  characterFk: text references characters.id ON DELETE CASCADE
  fame: integer
  level: integer
  capturedAt: integer (unix ms) not null
  INDEX (characterFk, capturedAt)
}

// gear_snapshot: full equip blob per snapshot
gear_snapshot {
  id: integer primary key autoincrement
  characterFk: text references characters.id ON DELETE CASCADE
  equipment: text       // JSON: response from /equip/equipment
  avatar: text          // JSON: /equip/avatar
  creature: text        // JSON
  flag: text            // JSON
  mistAssimilation: text// JSON
  talisman: text        // JSON (if endpoint exists; nullable)
  buffEquipment: text   // JSON
  buffAvatar: text
  buffCreature: text
  capturedAt: integer (unix ms) not null
  INDEX (characterFk, capturedAt)
}

// status_snapshot: stat block
status_snapshot {
  id: integer primary key autoincrement
  characterFk: text references characters.id ON DELETE CASCADE
  status: text          // JSON: response from /status
  buff: text            // JSON
  capturedAt: integer (unix ms) not null
  INDEX (characterFk, capturedAt)
}

// item_cache: avoid hammering /items/:itemId
item_cache {
  itemId: text primary key
  payload: text         // JSON
  fetchedAt: integer (unix ms)
}

// job_cache + skill_cache: static metadata
job_cache { jobId text pk, payload text, fetchedAt int }
skill_cache { jobId text, skillId text, payload text, fetchedAt int, PK(jobId,skillId) }

// guide_cache: scraped guide entries (Phase 5.5)
guide_cache {
  id: integer primary key autoincrement
  characterFk: text references characters.id ON DELETE CASCADE
  source: text         // 'dfo.gg' | 'dfoworld.kr'
  url: text not null
  title: text
  summary: text
  fetchedAt: integer (unix ms) not null
  INDEX (characterFk, source)
}
```

JSON-blob approach chosen for gear/status because Neople response shapes drift between game patches; storing raw payload + extracting fields on read survives schema changes. Indexed columns are only what we query/sort.

---

## File-Ownership Matrix (parallel-execution safety)

To prevent worker conflicts when `/team` spawns concurrent agents, each file has exactly one owning phase. Workers in later phases READ from earlier-phase outputs but MUST NOT WRITE to files owned by other phases without explicit handoff.

| File / Dir | Owner | Phase | Notes |
|------------|-------|-------|-------|
| `package.json`, `package-lock.json` | bootstrap | 0 | Only Phase 0 mutates deps. Later phases adding deps → bump in dedicated commit. |
| `.gitignore`, `.env.example`, `vitest.config.ts`, `drizzle.config.ts`, `next.config.js`, `tsconfig.json` | bootstrap | 0 | Frozen after Phase 0. |
| `db/schema.ts` | bootstrap | 0 | Frozen after Phase 0. Schema changes → new migration via `drizzle-kit generate`. |
| `db/index.ts` | bootstrap | 0 | Frozen. |
| `drizzle/migrations/**` | bootstrap | 0 (then append-only) | New migrations appended only; never edited in place. |
| `scripts/hash-passphrase.ts` | bootstrap | 0 | Frozen. |
| `lib/neople/**` | api-client | 1 | Each file owned by one Phase 1 subtask (see Phase 1 subtask table). |
| `tests/fixtures/neople/**` | api-client | 1 | Captured once, treated as test data after. |
| `tests/lib/neople/**` | api-client | 1 | |
| `app/page.tsx`, `app/roster/**`, `app/characters/**`, `app/items/**` | routes-ui | 2 | One worker per route subtree. |
| `app/api/characters/**`, `app/api/cron/**`, `app/api/items/**`, `app/api/jobs/**`, `app/api/skills/**` | routes-api | 2 | |
| `lib/snapshot.ts` | snapshot | 3 | |
| `app/api/cron/snapshot-all/**`, `app/api/health/**`, `vercel.json` | cron | 4 | |
| `components/**`, `app/globals.css` | ui-polish | 5 | shadcn-generated files owned by Phase 5. |
| `lib/scrapers/**`, `app/api/characters/[id]/fetch-guides/**` | scrapers | 5.5 | |
| `middleware.ts`, `app/login/**` | auth | 6 | |

**Spawn rule:** Phase N team-exec waits for Phase N-1 verify gate to pass before launching. Within a phase, decompose by file (each worker owns ≥1 distinct file). No two workers ever hold write locks on the same file.

**Phase 1 subtask decomposition (3 workers max):**
- Worker A: `client.ts`, `schemas.ts`, `limiter.ts`, fixtures capture
- Worker B: `servers.ts`, `characters.ts`, `portrait.ts`
- Worker C: `items.ts`, `jobs.ts`, tests for A+B's helpers

---

## Implementation Steps

### Phase 0 — Bootstrap (1 session)

1. `git init` + `git remote add origin git@github.com:JunHangWu-git/arad-atlas.git`. First commit captures planning state (`.omc/`, `AGENTS.md`).
2. `npm create next-app@latest . --ts --tailwind --app --src-dir=false --eslint` (scaffold into current dir; **keep default `@/*` import alias** — shadcn examples assume it).
3. Install runtime deps: `drizzle-orm @libsql/client zod recharts lucide-react bcryptjs robots-parser cheerio`
4. Install dev deps: `drizzle-kit vitest @vitest/coverage-v8 @types/bcryptjs @types/cheerio`
5. `npx shadcn@latest init` → add `button card table dialog input badge skeleton`
6. Create `.env.local` (copy from `.env.example`):
   ```
   DFO_API_KEY=<from ../DFO_API_KEY.txt>
   DATABASE_URL=file:./data.db
   APP_PASSPHRASE_HASH=<bcryptjs hash, see helper>
   CRON_SECRET=<openssl rand -hex 32>
   SESSION_SECRET=<openssl rand -hex 32>
   ```
   Turso vars (`TURSO_URL`, `TURSO_TOKEN`) added during cloud-promotion phase later. Commit `.env.example` with empty values.
7. Helper script `scripts/hash-passphrase.ts`:
   ```ts
   import bcrypt from "bcryptjs";
   console.log(bcrypt.hashSync(process.argv[2], 10));
   ```
   Run: `npx tsx scripts/hash-passphrase.ts <passphrase>` → copy hash to `APP_PASSPHRASE_HASH`.
8. `db/schema.ts` + `db/index.ts` (Drizzle client, libSQL `file:` driver). `drizzle.config.ts` points at `DATABASE_URL`.
9. **Migrations workflow (replaces `db:push`):**
   - `npx drizzle-kit generate` → emits `drizzle/migrations/0000_init.sql`, **checked into git**.
   - `npx drizzle-kit migrate` to apply to local `data.db`.
   - `package.json` scripts: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`. **Never `db:push` in any environment.**
10. Create `tests/fixtures/neople/` directory (populated by Phase 1).
11. `.gitignore`: `.env*` (except `.env.example`), `data.db`, `data.db-*`, `node_modules`, `.next`, `coverage/`. Verify `DFO_API_KEY.txt` lives outside repo (`../DFO_API_KEY.txt`).
12. `vitest.config.ts` — basic config, jsdom env for component tests, node env for lib tests.

### Phase 1 — Neople API client (`lib/neople/`)

**Phase 1 task 0 — capture live fixtures** (before writing any code):
- For one real character in `cain`, curl each of 10 endpoints with Nick's key
- Save raw JSON responses to `tests/fixtures/neople/{endpoint}.json`
- Use fixtures to derive Zod schemas, NOT the public docs (docs lag behind Global API)
- Specifically verify: `GET /df/servers/cain/characters?characterName=<urlencoded-name>&wordType=match` is the correct search URL

Files (each starts with `import "server-only"`):
- `lib/neople/client.ts` — base `neopleFetch(path, params)` that injects `apikey`, retries 5xx ×2, throws typed `NeopleError` on 4xx
- `lib/neople/schemas.ts` — Zod schemas per endpoint response (derived from captured fixtures)
- `lib/neople/servers.ts` — `getServers()`
- `lib/neople/characters.ts` — `searchCharacter(server, name)`, `getCharacter(server, id)`, `getStatus`, `getEquipment`, `getAvatar`, `getCreature`, `getFlag`, `getMistAssimilation`, `getSkillStyle`, `getBuffEquip`
- `lib/neople/items.ts` — `getItem(itemId)` with `item_cache` lookup-aside (TTL 30 days)
- `lib/neople/jobs.ts` — `getJobs`, `getSkills(jobId)` cached forever per game patch

**Rate limiting:** `lib/neople/limiter.ts` — token bucket, 50 req/sec ceiling (Neople public limit is higher but be polite).

**Portrait URL helper:** `lib/neople/portrait.ts` — `portraitUrl(serverId, characterId, zoom=1)` returns `https://img-api.dfoneople.com/df/servers/${serverId}/characters/${characterId}?zoom=${zoom}`.

**Tests** (`tests/lib/neople/*.test.ts`):
- Mock `global.fetch` to return fixture JSON; verify each helper parses + returns typed value
- Schema-drift sim: tamper one field, assert `safeParse` fails and `client.ts` logs a warning (does not throw)

### Phase 2 — Routes + Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Landing → roster |
| `/roster` | `app/roster/page.tsx` (RSC) | List + add character form |
| `/characters/[id]` | `app/characters/[id]/page.tsx` | Overview: portrait, fame chart, stat highlights, last refresh |
| `/characters/[id]/gear` | …/gear/page.tsx | Equipment + avatar + creature + flag + mist + buff gear |
| `/characters/[id]/skills` | …/skills/page.tsx | Skill style + class skill list |
| `/characters/[id]/timeline` | …/timeline/page.tsx | Activity log (best-effort; hidden if endpoint unavailable on Global API — see Risk 1) |
| `/characters/[id]/guides` | …/guides/page.tsx | User-supplied guide URLs |
| `/items/[itemId]` | `app/items/[itemId]/page.tsx` | Cached item detail |
| `/api/characters` | `app/api/characters/route.ts` | POST add, GET list |
| `/api/characters/[id]` | …/[id]/route.ts | GET, DELETE |
| `/api/characters/[id]/refresh` | …/refresh/route.ts | POST snapshot now |
| `/api/cron/snapshot-all` | `app/api/cron/snapshot-all/route.ts` | Cron-only, header-protected |

### Phase 3 — Snapshot logic

File: `lib/snapshot.ts`

```
async function snapshotCharacter(charFk):
  // per-char mutex: 60s lease prevents cron+manual collision
  lock = await acquireSnapshotLock(charFk, leaseMs=60_000)
  if !lock: return { ok: false, reason: 'locked' }
  try:
    char = db.characters.get(charFk)
    [basic, status, equip, avatar, creature, flag, mist, buffEquip] =
      await Promise.allSettled([
        getCharacter, getStatus, getEquipment, getAvatar,
        getCreature, getFlag, getMistAssimilation, getBuffEquip
      ])
    tx:
      insert fame_snapshot { fame: basic.fame, level: basic.level }
      insert gear_snapshot { ...all equip JSON }
      insert status_snapshot { status, buff }
      update characters set level, jobName, adventureName, updatedAt
    return { ok, errors: failed promises }
  finally:
    releaseSnapshotLock(charFk)
```

`Promise.allSettled` so one 5xx endpoint doesn't lose other data.

**Snapshot lock implementation:** new table
```
snapshot_lock { characterFk text pk, expiresAt integer }
```
`acquireSnapshotLock(charFk, leaseMs)` =
```sql
INSERT INTO snapshot_lock(characterFk, expiresAt)
VALUES (?, unixepoch()*1000 + ?)
ON CONFLICT(characterFk) DO UPDATE
SET expiresAt = excluded.expiresAt
WHERE snapshot_lock.expiresAt < unixepoch()*1000
RETURNING characterFk;
```
Returns row iff lock acquired (previous expired). Concurrent caller gets empty result → returns `{ ok: false, reason: 'locked' }`. Manual refresh UI shows toast "Already refreshing".

**Snapshot orchestrator concurrency** (per AC#10): use `Promise.allSettled` over the 8 endpoint calls *per character*. Across characters in cron, run **sequentially** (roster 1-5). Drop reference to "concurrency-3" — pick one strategy.

### Phase 4 — Cron + health

**`vercel.json`** (cron + auth header):
```json
{
  "crons": [
    { "path": "/api/cron/snapshot-all", "schedule": "0 8 * * *" }
  ]
}
```

**Auth model** (explicit, no ambiguity):
- Set `CRON_SECRET` env var in Vercel (project settings).
- Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET` header on Pro+; on Hobby this also works because Vercel injects the secret. Confirmed pattern.
- Handler `/api/cron/snapshot-all/route.ts`:
  ```ts
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return new Response("unauthorized", { status: 401 });
  ```
  Use constant-time compare (`timingSafeEqual`) for the bearer body when secret is short.
- Locally test cron handler via `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/snapshot-all`.

**Loop:** all chars **sequentially** (roster 1-5). Each call to `snapshotCharacter(charFk)` respects its own per-char lock. Logs per-char outcome to `console.info`.

**Health endpoint** (cron-fail alerting):
- `/api/health/last-snapshot` returns `{ ok: bool, maxAgeMs: number, characterCount: number }`.
  - `maxAgeMs = now() - min(latest_fame_snapshot.capturedAt) across all chars`.
  - `ok = maxAgeMs < 30*60*60*1000` (30h tolerance for the 24h cron).
- Roster page renders a red badge "Snapshots stale (Xh ago)" when `!ok`.
- Optional: UptimeRobot/cron-job.org pings the endpoint daily; alerts if non-200.

### Phase 5 — UI polish

- Dark theme default (DFO aesthetic)
- Item rarity colors: `text-rarity-{common,uncommon,rare,unique,epic,legendary,mythic,chronicle}`
- Fame line chart with hover tooltips
- Skeleton loaders on RSC suspense boundaries
- Manual "Add guide URL" inline form on `/guides`

### Phase 5.5 — Guides Scraper (manual trigger)

**Phase 5.5 task 0 — feasibility gate** (BLOCKING; run before writing scraper code):
- `curl -sA "Mozilla/5.0" https://dfo.gg/ | grep -c '<class-specific-visible-text>'` (replace with a known class name in Korean/English)
- Same for `dfoworld.kr`
- If either returns 0 hits → site is JS-rendered, `cheerio` insufficient. **Decision matrix:**
  - Both JS-rendered → **defer Phase 5.5 to v1.1**, revert `/guides` page to free-text URL input only
  - One works, one doesn't → ship scraper for the working site only; free-text fallback for the other
  - Both work → proceed as planned below
- Document curl output in `.omc/research/scraper-feasibility-2026-05-26.md` before any code

Files: `lib/scrapers/dfogg.ts`, `lib/scrapers/dfoworld.ts`, `lib/scrapers/robots.ts`, `lib/scrapers/index.ts`, route `POST /api/characters/[id]/fetch-guides`.

Behavior:
- Triggered only via "Fetch guides" button on `/characters/[id]/guides` (no auto-run on snapshot).
- Resolves class slug from `jobName` → site-specific URL (e.g. `dfo.gg/class/{slug}`, `dfoworld.kr/...`).
- **Robots.txt enforcement (implemented, not asserted):**
  ```ts
  import robotsParser from "robots-parser";
  const robotsTxt = await fetch(`https://${host}/robots.txt`).then(r => r.text());
  const parser = robotsParser(`https://${host}/robots.txt`, robotsTxt);
  if (!parser.isAllowed(targetUrl, USER_AGENT)) {
    log.warn(`robots.txt disallows ${targetUrl}`);
    return { skipped: true, reason: "robots" };
  }
  ```
  Cache parsed robots in-memory per host for 24h.
- `fetch` with browser-like UA, 1 req/site/char with 1s gap, parse with `cheerio`.
- Cache results in `guide_cache { characterFk, source, url, title, summary, fetchedAt }` table; 7-day TTL — re-fetch only on user click after expiry.
- Failures: per-source try/catch, surface partial results, log warnings. Never block the page.
- Attribution: render `Source: dfo.gg` link next to each cached entry.

Deps already in Phase 0 install list: `cheerio`, `robots-parser`.

### Phase 6 — Single-user auth

`middleware.ts` checks signed cookie. `/login` page accepts passphrase, bcrypt-compares against `APP_PASSPHRASE_HASH`, sets HTTP-only signed cookie (7-day expiry). Excludes `/api/cron/*` (uses CRON_SECRET instead) and `/api/health/*` (public).

**Runtime constraint:** Next.js middleware runs on **Edge runtime** by default, which does not support native modules. Use `bcryptjs` (pure-JS, already in Phase 0 deps) — NOT `bcrypt` (native, breaks Edge).

**Cookie signing:** use `iron-session` or a plain HMAC-SHA256 with `SESSION_SECRET` env var. Cookie attrs: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`.

**Login form:** `/login` POST → `app/api/auth/login/route.ts` (Node runtime to be safe), compares hash, sets cookie. Logout: `/api/auth/logout` clears cookie.

### Phase 7 — Deploy (deferred until v1 verified locally)

Prereq: Phases 0-6 complete + verified against `file:./data.db`.

1. Push to GitHub: `git push -u origin main` to `JunHangWu-git/arad-atlas`.
2. Turso setup walk-through (Nick + Claude pair):
   - Install Turso CLI (`curl -sSfL https://get.tur.so/install.sh | bash`)
   - `turso auth signup` → `turso db create arad-atlas`
   - `turso db show arad-atlas --url` + `turso db tokens create arad-atlas`
   - `db/index.ts` selects driver from explicit env: if `TURSO_URL` set → `createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })`, else fall back to `createClient({ url: DATABASE_URL })`. Avoids `NODE_ENV` switching (lets local dev hit Turso for migration tests).
3. Vercel setup walk-through:
   - `vercel.com/new` → import `JunHangWu-git/arad-atlas`
   - Env vars: `DFO_API_KEY`, `TURSO_URL`, `TURSO_TOKEN`, `APP_PASSPHRASE_HASH`, `CRON_SECRET`
   - Deploy
4. Run `npx drizzle-kit migrate` (NOT `push`) against Turso prod via `TURSO_URL`+`TURSO_TOKEN` env. Applies versioned migrations from `drizzle/migrations/`. Idempotent — preserves all existing data.
5. Add first character, verify refresh + portrait + chart
6. Wait 24h, verify cron fired (Vercel dashboard → Crons tab) AND `/api/health/last-snapshot` returns `ok: true`

---

## Risks + Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| 1 | `/timeline` endpoint absent from Global API list — activity log feature may not be available | High | Medium | Phase 1: probe `GET /df/servers/cain/characters/{id}/timeline?startDate=...&endDate=...` directly with Nick's key. If 404, hide timeline page + remove from nav. If works (undocumented), proceed but mark fragile. |
| 2 | Talisman/Rune endpoint not in confirmed list (Global API may have replaced with mist-assimilation) | Medium | Low | Implement `getMistAssimilation` (confirmed). Probe `/equip/talisman` once; if 404, drop column. |
| 3 | API key leakage if accidentally imported into client component | Low | High | (a) Use `import "server-only"` at top of every `lib/neople/*.ts`. (b) CI grep step: `grep -r "DFO_API_KEY" .next/static && exit 1`. (c) `DFO_API_KEY` never prefixed with `NEXT_PUBLIC_`. |
| 4 | Vercel Hobby cron limited to daily | Low | Low | Daily snapshot is sufficient for fame trend. If need finer, switch to GitHub Actions cron (free, every-15-min capable). |
| 5 | Neople schema drift between patches breaks Zod parse | Medium | Medium | Wrap each endpoint in try/catch around `schema.safeParse`; on fail, store raw JSON to `gear_snapshot` (already JSON blob) + log warning. Don't fail entire snapshot. |
| 6 | Turso free tier limits (5 DBs, 9GB total, 1B row reads/mo) | Low | Low | Personal use stays orders of magnitude below. Monitor via Turso dashboard. |
| 7 | Character login-activity gate: API returns 404 for chars not logged in within 1 year | Low | Low | Display "inactive" state on char page; don't drop the char from roster. |
| 8 | Image CDN `img-api.dfoneople.com` may not have `?zoom` param on Global | Low | Low | Phase 5: verify URL pattern in browser; fall back to `<img>` without zoom param. |
| 9 | Single-user passphrase weak vs unauthorized roster reads | Low | Low | Passphrase + signed cookie sufficient for personal scope. If exposed, no PII leaks — only public char data. Don't store anything sensitive beyond `DFO_API_KEY` (env-only). |
| 10 | Neople ToS prohibits commercial use / certain caching durations | Low | Medium | Personal use is allowed. Item/job/skill cache TTL ≤30 days. Don't redistribute API data. |
| 11 | dfo.gg / dfoworld.kr HTML structure changes break scraper | Medium | Low | Manual-trigger scope limits blast radius. Per-source try/catch, 7-day cache, surface partial results. Document selectors in scraper file header. |
| 12 | Sites block scraper UA or rate-limit | Low | Low | Manual-trigger + 1s gap + 7-day cache keeps volume trivial. Respect robots.txt; skip if disallowed. |

---

## Verification Steps

After Phase 7 deploy, before declaring done:

1. **Smoke:** `curl https://<app>.vercel.app/api/characters` returns `401` without cookie.
2. **API-key isolation:** `curl -sI https://<app>.vercel.app/_next/static/chunks/main-*.js | head` returns 200; downloaded JS searched for `DFO_API_KEY` value → 0 hits.
3. **Add char:** Login, add real character. DB row appears in `characters` table (Turso shell: `select * from characters`).
4. **Refresh:** Click refresh. `fame_snapshot`, `gear_snapshot`, `status_snapshot` each gain 1 row.
5. **Portrait:** Image loads from `img-api.dfoneople.com` in Network tab (200).
6. **Cron:** Wait until next 08:00 UTC. Check Vercel → Crons → Last execution = success. Verify `fame_snapshot.count()` increased by exactly `characters.count()`.
7. **Chart:** Refresh manually + wait for cron → `/characters/[id]` shows ≥2 data points connected by line.
8. **Rate limit:** Bulk-refresh 5 chars from roster page → all complete < 10s, no 429 in logs.
9. **Type safety:** `npm run build` exits 0. `tsc --noEmit` exits 0.
10. **Schema drift sim:** Manually delete a field from a Neople response in dev (intercept). Refresh → snapshot still saves raw, warning logged, app does not crash.

---

## Resolved Decisions (2026-05-26 interview)

1. **Main server:** `cain` — default dropdown selection.
2. **Roster size:** 1-5 chars — sequential snapshot, drop `p-limit` (concurrency-3 unneeded). Refresh-all stays well under rate cap.
3. **Domain:** Vercel `*.vercel.app` subdomain. No custom domain v1.
4. **Guide links:** Manual scraper trigger from `dfo.gg` + `dfoworld.kr` (Phase 5.5). User clicks "Fetch guides" per char; results cached in DB. Polite rate, attribution preserved.
5. **Item icons:** text-only v1. Icons deferred to v1.1.
6. **Infra:** local-first dev with `file:./data.db` libSQL. Defer Turso/Vercel cloud setup; walk-through after v1 works locally.
7. **Git remote:** `git@github.com:JunHangWu-git/arad-atlas.git` — push enabled from Phase 0.

---

## Estimated Effort

| Phase | Effort | Note |
|-------|--------|------|
| 0 Bootstrap | 0.5 day | Project scaffold, DB setup |
| 1 API client | 1 day | 10 endpoints + Zod + retry |
| 2 Routes + pages | 1.5 days | RSC + shadcn UI |
| 3 Snapshot | 0.5 day | Orchestrator + tests |
| 4 Cron | 0.25 day | One handler + vercel.json |
| 5 UI polish | 1 day | Charts, rarity, dark theme |
| 5.5 Scraper | 0.5 day | dfo.gg + dfoworld.kr, manual trigger |
| 6 Auth | 0.5 day | Middleware + login page |
| 7 Deploy | 0.5 day | Pair walk-through Turso + Vercel |
| **Total** | **~6.25 days** | Personal-use bar, no extensive testing |

---

## Execution Mode

Approved 2026-05-26 for **team** execution via `/oh-my-claudecode:team`. Pipeline: `team-plan → team-prd → team-exec → team-verify → team-fix (loop)`.

Phase 0 + 1 first wave only. Subsequent phases re-spawn team after each gate (so Nick can review before next batch hits filesystem).
