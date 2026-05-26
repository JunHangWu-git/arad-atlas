<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-26 | Updated: 2026-05-26 -->

# .omc

## Purpose
oh-my-claudecode (OMC) working directory. Holds two distinct concerns: **runtime state** the OMC harness reads/writes during a session, and **durable planning artifacts** that survive across sessions. Do not conflate them — `state/` is ephemeral tool data; `plans/` is human-readable design intent.

## Key Files
None at the directory root. All content lives in subdirectories.

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `plans/` | Approved + pending work plans, ADRs, design docs (see `plans/AGENTS.md`) |
| `state/` | OMC harness runtime: agent replay logs, HUD cache, subagent tracking. **Tool-managed.** Do not hand-edit. |

## For AI Agents

### Working In This Directory
- **`state/` is off-limits for manual edits.** Files there are written by OMC tools (`state_write`, hooks, HUD). Editing them risks corrupting session continuation, ralplan-state enforcement, or replay logs. The only legitimate writers are `state_write` / `state_clear` MCP tools and the harness itself.
- **`plans/` is the durable contract.** Plans are the source of truth for what gets built. When a plan is marked `pending approval`, do NOT execute it — wait for Nick's explicit approval signal (`approve ralph` / `approve team` / `approve manual`).
- **Adding new artifact types:** if you introduce a new artifact category (research notes, ADRs, PRDs), give it its own subdirectory (`.omc/research/`, `.omc/adrs/`) rather than dumping into `plans/`. Update this AGENTS.md.

### Testing Requirements
N/A — no executable code lives here.

### Common Patterns
- Plans live under `plans/` as `<kebab-case-feature-name>.md`
- Plans use the OMC plan-skill template: Requirements → Acceptance Criteria → Stack → Architecture → Data Model → Implementation Steps → Risks → Verification → Open Questions → Next Step
- Status field at top of every plan: `pending approval` | `approved` | `in-progress` | `done` | `abandoned`

## Dependencies

### Internal
- Root `AGENTS.md` describes the overall project context that plans target.

### External
- OMC plan/ralph/team skills consume files here
- Stop-hook reads `state/ralplan-state.json` (when present) to enforce consensus-planning continuation

<!-- MANUAL: -->
