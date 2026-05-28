## Handoff: Phase 3 (snapshot logic) → Phase 4 (cron + health) / Phase 5 (UI polish)

**Status:** Phase 3 COMPLETE. Gate green — `tsc` clean, 52 tests pass (+10 snapshot), `next build` OK.

- **Decided**:
  - `lib/snapshot.ts` (server-only):
    - `acquireSnapshotLock(id, leaseMs=60_000)` / `releaseSnapshotLock(id)` — atomic via raw SQL `INSERT ... ON CONFLICT DO UPDATE ... WHERE expires_at < unixepoch()*1000 RETURNING`. Returns true iff acquired.
    - `snapshotCharacter(id): Promise<SnapshotResult>` — lock → load char → `Promise.allSettled` over 10 neople helpers (getCharacter/Status/Equipment/Avatar/Creature/Flag/MistAssimilation/BuffEquipment/BuffAvatar/BuffCreature) → `db.transaction` inserts fame+gear+status snapshots + updates characters(level,jobName,adventureName,updatedAt) → release in finally. `SnapshotResult = { ok, reason?: "locked"|"not_found", errors?: string[] }` (errors = rejected endpoint names).
    - UI read helpers: `getFameHistory(id, limit?)` (asc by capturedAt), `getLatestGearSnapshot(id)`, `getLatestStatusSnapshot(id)` — defensive JSON.parse → null on bad data.
  - `POST /api/characters/[id]/refresh` → ok→200, locked→409 "Already refreshing", not_found→404, else 500.
  - Char pages wired: overview shows `<FameChart>` (recharts, client) when `fame.length>=2` else empty state + `<RefreshButton>` (client, POSTs refresh, router.refresh, 409 inline). gear page renders `gear.equipment.equipment[]` (slot/name/rarity Badge) defensively. skills page renders `status.buff.buff[]` defensively. All snapshot blob reads are shape-guarded.
- **Rejected**: live class-skill API on skills page (deferred). buffAvatar/buffCreature filled (not left null) — cheap + complete. talisman column stays null (no Global endpoint).
- **Risks**:
  - Snapshot blob shapes are assumptions (`equipment.equipment[]`, `status.status[]`, `status.buff.buff[]`) — verify against a real refresh in-browser; pages won't crash on mismatch but may render empty.
  - NOT verified in browser — gate is tsc+vitest+build only. No real snapshot captured yet (needs a character added + refresh clicked against live API).
  - `db.transaction` on libSQL file driver assumed supported — covered by unit tests with mocked db, not a real file tx.
- **Files**: lib/snapshot.ts; tests/lib/snapshot.test.ts; app/api/characters/[id]/refresh/route.ts; app/characters/[id]/{page,gear,skills}/page.tsx (edited); app/characters/[id]/{fame-chart,refresh-button}.tsx (new client comps).
- **Remaining**:
  - **Phase 4**: `app/api/cron/snapshot-all/route.ts` (Bearer CRON_SECRET, timingSafeEqual, sequential over roster), `app/api/health/last-snapshot/route.ts` (maxAgeMs/ok), roster "snapshots stale" badge, `vercel.json` crons. NOTE: Vercel/Turso deploy infra deferred to Phase 7 — cron handler can be built + curl-tested locally now.
  - **Phase 5**: dark theme, rarity colors, chart tooltips polish, skeleton loaders, inline "add guide URL" form on /guides.
