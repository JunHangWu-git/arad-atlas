# Neople DFO Global API — Live Probe Results (2026-05-27)

Captured against real char **coo1guy** / server **cain** using Nick's key.
Fixtures saved to `tests/fixtures/neople/*.json`. Derive Zod schemas from these, NOT public docs.

## Resolved identifiers (test char)
- serverId: `cain`
- characterId: `1a5a0b62c6c189e69a00248aa9f9d0b1`
- jobId: `0b2b0ac15e70d4fc9f4094b9a90937a6` (Demonic Lancer)
- jobGrowId: `ba2ae3598c3af10c26562e073bc92060` (Neo: Vanguard)
- sample itemId: `b2c5abf97c711c9d39455012df5a9e74` (Primeval Star - Halberd, rarity "Primeval")

## Endpoint contract (base = https://api.dfoneople.com, all need `?apikey=`)

| Helper | Path | HTTP | Notes |
|--------|------|------|-------|
| getServers | `/df/servers` | 200 | |
| searchCharacter | `/df/servers/{server}/characters?characterName={name}&wordType=match` | 200 | returns `{rows:[...]}` |
| getCharacter | `/df/servers/{server}/characters/{id}` | 200 | base fields only |
| getStatus | `/df/.../{id}/status` | 200 | base + `buff` + `status` |
| getEquipment | `/df/.../{id}/equip/equipment` | 200 | `{equipment:[...]}` |
| getAvatar | `/df/.../{id}/equip/avatar` | 200 | |
| getCreature | `/df/.../{id}/equip/creature` | 200 | |
| getFlag | `/df/.../{id}/equip/flag` | 200 | |
| getMistAssimilation | `/df/.../{id}/equip/mist-assimilation` | 200 | base + `mistAssimilation` |
| getSkillStyle | `/df/.../{id}/skill/style` | 200 | |
| getBuffEquip | `/df/.../{id}/skill/buff/equip/equipment` | 200 | |
| getBuffAvatar | `/df/.../{id}/skill/buff/equip/avatar` | 200 | |
| getBuffCreature | `/df/.../{id}/skill/buff/equip/creature` | 200 | |
| getJobs | `/df/jobs` | 200 | `{rows:[{jobId,jobName,rows:[{jobGrowId,...,next}]}]}` |
| getSkills | `/df/skills/{jobId}?jobGrowId={jobGrowId}` | 200 | **jobGrowId REQUIRED** — 400 DNF901 without it. Returns `{skills:[...]}` (42 for test char) |
| getItem | `/df/items/{itemId}` | 200 | has `itemName`, `itemRarity` |

## Probe outcomes (resolve plan Risk 1 & 2)
- **talisman** `/equip/talisman` → **404**. CONFIRMED ABSENT. Drop `getTalisman` + `talisman` column. (Risk 2)
- **timeline** `/{id}/timeline` → **404**. CONFIRMED ABSENT on Global. Hide `/characters/[id]/timeline` page + remove from nav. (Risk 1)
- **mist-assimilation** → 200. Use this in place of talisman/rune.

## Error envelope (for client.ts error handling)
4xx returns `{"error":{"status":int,"code":"DNFxxx","message":"..."}}`.
Example skills-without-jobGrowId: `{"error":{"status":400,"code":"DNF901","message":"NOT_FOUND_SEARCH_VALUE"}}`.

## Char-endpoint base fields (shared envelope on most character calls)
`serverId, characterId, characterName, level, jobId, jobGrowId, jobName, jobGrowName, fame, adventureName, guildId, guildName` — then endpoint-specific key appended (`status`+`buff`, `mistAssimilation`, etc.).
