<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-26 | Updated: 2026-05-26 -->

# plans

## Purpose
Durable, version-controllable work plans. Each plan is the contract between requirements gathering and execution: stack, schema, acceptance criteria, risks, and verification steps frozen at approval time. Execution skills (`ralph`, `team`) read these files as the implementation blueprint.

## Key Files
| File | Description |
|------|-------------|
| `dfo-character-tracker.md` | Personal-use DFO progression tracker. Next.js 15 + Drizzle + Turso + Vercel Cron. **Status: pending approval.** 7 phases, ~5.5 days effort, 10 risks documented. Source of truth for arad-atlas. |

## Subdirectories
None.

## For AI Agents

### Working In This Directory
- **Plans are immutable once approved** unless Nick explicitly says revise. If a constraint surfaces mid-execution that invalidates the plan, halt execution, document the constraint in the plan's Risks/Open-Questions section, and ask Nick before proceeding.
- **One plan = one feature/project.** Do not bolt new scope onto an existing plan. Create `feature-name-v2.md` or a separate plan file.
- **Status field is load-bearing.** The status header (`pending approval` / `approved` / `in-progress` / `done`) gates whether execution skills will pick the plan up. Keep it accurate.
- **Drafts** (work-in-progress, not yet shown to Nick) go under `.omc/drafts/`, NOT here.

### Testing Requirements
- Plan-quality bar (from OMC plan skill):
  - 80%+ of claims cite file/line where applicable
  - 90%+ of acceptance criteria are concrete (testable, with measurable outcomes)
  - All risks have mitigations
  - No vague terms without metrics ("fast" → "p99 < 200ms")

### Common Patterns
Plan template sections (in order):
1. **Status / Owner / Created / Mode** header block
2. **Requirements Summary** — in-scope + out-of-scope
3. **Acceptance Criteria** — numbered, testable
4. **Tech Stack** — table with reasoning
5. **Architecture** — ASCII diagram
6. **Data Model** — Drizzle/SQL schema if persistent
7. **Implementation Steps** — phased, with file paths
8. **Risks + Mitigations** — table with likelihood × impact
9. **Verification Steps** — runnable checks post-deploy
10. **Open Questions** — unresolved items needing Nick's input
11. **Estimated Effort** — phase × time
12. **Next Step** — explicit approval-path options

## Dependencies

### Internal
- Parent `.omc/AGENTS.md` for OMC directory conventions
- Root `AGENTS.md` for project-wide context

### External
- OMC `plan` skill writes here
- OMC `ralph` / `team` execution skills read approved plans here
- OMC `review` mode (Critic agent) evaluates plans here

<!-- MANUAL: -->
