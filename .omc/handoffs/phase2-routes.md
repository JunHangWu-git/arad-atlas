## Handoff: Phase 2 (routes + pages) → Phase 3 (snapshot logic)

**Status:** Phase 2 COMPLETE. Gate green — `tsc` clean, 42 tests pass, `next build` OK. Migration applied to local `data.db` (9 tables live).

- **Decided**:
  - `lib/roster.ts` = roster repository (server-only). `RosterCharacter` interface + `listRoster` / `getRosterCharacter` / `addCharacter(serverId,name)` / `deleteCharacter`. Deterministic PK `id = ${serverId}-${characterId}`. `addCharacter` = searchCharacter → take rows[0] → enrich via getCharacter (fallback to search row on failure) → upsert on (serverId,characterId). `guideUrls` stored as JSON string, parsed to `string[]`.
  - API envelope everywhere `{ success, data?, error? }`. `NeopleError.status` → HTTP status; "Character not found:" Error → 404.
  - Routes: `POST/GET /api/characters`, `GET/DELETE /api/characters/[id]`, `GET /api/items/[itemId]`, `GET /api/jobs`, `GET /api/skills/[jobId]` (jobGrowId required → 400 if missing).
  - Pages: `/` landing → `/roster` (RSC list + add form + delete, client comp `app/roster/add-character-form.tsx`), `/items/[itemId]`, `/characters/[id]` overview + `/gear` `/skills` `/guides` (layout.tsx = portrait header + 4-tab nav). Snapshot-derived sections (fame chart, gear, status, skills) render **"no snapshots yet"** empty states.
- **Rejected**: timeline page (404 on Global API — dropped, not in nav). Live gear/status fetch in char pages (deferred — comes from snapshots in Phase 3). recharts (no chart lib yet — overview has a placeholder card).
- **Risks**:
  - `/roster` MUST stay `export const dynamic = "force-dynamic"` — static prerender hit the DB at build time and failed (`no such table`). Any new DB-reading **static** route needs the same. Dynamic `[param]` routes are fine (rendered on-demand).
  - `data.db` is gitignored + must be migrated (`npx drizzle-kit migrate`) on any fresh checkout before the app runs.
  - Add/delete use client `fetch` + `router.refresh()` (no server actions).
- **Files**: lib/roster.ts; app/page.tsx; app/roster/{page,add-character-form}.tsx; app/items/[itemId]/page.tsx; app/characters/[id]/{layout,page}.tsx + {gear,skills,guides}/page.tsx; app/api/characters/route.ts + [id]/route.ts; app/api/items/[itemId]/route.ts; app/api/jobs/route.ts; app/api/skills/[jobId]/route.ts.
- **Remaining (Phase 3)**: `lib/snapshot.ts` (`snapshotCharacter` w/ 60s per-char lock, Promise.allSettled over getCharacter/getStatus/getEquipment/getAvatar/getCreature/getFlag/getMistAssimilation/getBuffEquipment, tx insert fame/gear/status snapshots + update characters row). Then `POST /api/characters/[id]/refresh` + wire overview fame chart (recharts) + gear/skills/status pages to read latest snapshots. NOT verified in browser this session.
