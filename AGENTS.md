<!-- Generated: 2026-05-26 | Updated: 2026-05-26 -->

# arad-atlas

## Purpose
Pre-implementation workspace for a personal-use **Dungeon Fighter Online (DFO Global / dfoneople.com) character progression tracker**. Currently holds planning artifacts only — no application source code exists yet. Implementation will scaffold a Next.js 15 + TypeScript fullstack web app per `.omc/plans/dfo-character-tracker.md`.

**Project codename:** arad-atlas. "Arad" = DFO continent setting; "atlas" = the multi-character roster + fame-history map.

## Current State
Repo phase: **plan-only**. The plan is marked `pending approval`. No `package.json`, no `src/`, no `app/`. Once Nick approves execution (via `ralph`, `team`, or manual), Phase 0 of the plan will scaffold Next.js into this same directory.

## Key Files
| File | Description |
|------|-------------|
| `.claude/settings.local.json` | Local Claude Code harness settings (permissions, allowed tools) |

No top-level config, source, or build files yet.

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `.claude/` | Claude Code harness config (local-only, not project documentation) |
| `.omc/` | oh-my-claudecode state + planning artifacts (see `.omc/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- **Read the plan first:** `.omc/plans/dfo-character-tracker.md` is the source of truth for stack, architecture, schema, acceptance criteria, and risks. Do not freelance design choices that contradict the approved plan.
- **API key handling:** `DFO_API_KEY` lives in `../DFO_API_KEY.txt` (outside the repo). When implementation begins, copy into `.env.local` only — never commit, never expose via `NEXT_PUBLIC_*`, never log. Every Neople API helper must start with `import "server-only"`.
- **Plan modifications require Nick's approval.** If a discovered constraint forces a deviation (e.g. endpoint not available on Global API), document the deviation in the plan's "Risks" or "Open Questions" section before changing code.
- **No execution from planning mode.** Until the plan is approved and execution skill (`ralph` / `team` / manual) is invoked, do not run `npm create`, `npm install`, mutate files outside `.omc/`, commit, or push.

### Testing Requirements
- No tests exist yet. Once scaffolded (Phase 1+), follow the plan's Verification Steps section.
- Type safety gate: `tsc --noEmit` must exit 0 before any merge.
- API-key isolation gate: `grep -r "DFO_API_KEY" .next/static` must return 0 hits.

### Common Patterns (planned, not yet enforced)
- Next.js 15 App Router with React Server Components by default
- Drizzle ORM on Turso libSQL
- Zod-validated parsing of every Neople response
- `Promise.allSettled` for multi-endpoint snapshot orchestration
- shadcn/ui + Tailwind v4 for components
- Server-only API key access (no `NEXT_PUBLIC_*` for secrets)

## Dependencies

### External (planned)
- Neople DFO Open API — `api.dfoneople.com/df/*` (key registration at developers section of dfoneople.com)
- Vercel Hobby — hosting + cron
- Turso — libSQL database, free tier
- Node 20+ (Next.js 15 requirement)

### Internal
None yet. Future internal deps will be documented per-directory once code lands.

## Roadmap (per plan)
| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Bootstrap (Next.js + Drizzle + Turso) | pending approval |
| 1 | Neople API client (`lib/neople/`) | pending |
| 2 | Routes + RSC pages | pending |
| 3 | Snapshot orchestrator | pending |
| 4 | Vercel Cron | pending |
| 5 | UI polish | pending |
| 6 | Single-user auth | pending |
| 7 | Deploy | pending |

<!-- MANUAL: Add notes below this line; they survive regeneration. -->
