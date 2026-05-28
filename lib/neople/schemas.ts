import "server-only";

import { z } from "zod";

/**
 * Zod schemas for the Neople DFO Global API, derived from real captured
 * fixtures (tests/fixtures/neople/*.json), NOT public docs.
 *
 * Philosophy: pin down only the fields we actually query (ids, names, fame,
 * level, rarity). Deeply nested / highly variable gear blobs are kept
 * permissive (`.passthrough()`, `z.unknown()`) so that game patches that add
 * or reshape fields do not break parsing. We must not lose data on drift.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** A named status entry. `value` is sometimes numeric, sometimes a string
 *  like "10%" or "356.8%" in the live API, so accept both. */
export const statEntrySchema = z
  .object({
    name: z.string(),
    value: z.union([z.number(), z.string()]),
  })
  .passthrough();
export type StatEntry = z.infer<typeof statEntrySchema>;

/** Shared character envelope present on most character-scoped endpoints. */
export const characterBaseSchema = z
  .object({
    serverId: z.string(),
    characterId: z.string(),
    characterName: z.string(),
    level: z.number(),
    jobId: z.string(),
    jobGrowId: z.string(),
    jobName: z.string(),
    jobGrowName: z.string(),
    fame: z.number(),
    adventureName: z.string().nullable().optional(),
    guildId: z.string().nullable().optional(),
    guildName: z.string().nullable().optional(),
  })
  .passthrough();
export type CharacterBase = z.infer<typeof characterBaseSchema>;

// ---------------------------------------------------------------------------
// Servers
// ---------------------------------------------------------------------------

export const serverEntrySchema = z
  .object({
    serverId: z.string(),
    serverName: z.string(),
  })
  .passthrough();
export type ServerEntry = z.infer<typeof serverEntrySchema>;

export const serverListSchema = z
  .object({
    rows: z.array(serverEntrySchema),
  })
  .passthrough();
export type ServerList = z.infer<typeof serverListSchema>;

// ---------------------------------------------------------------------------
// Character search
// ---------------------------------------------------------------------------

/** Search rows carry the base identity fields but NOT the optional adventure/
 *  guild fields, so describe the minimal queried shape and stay permissive. */
export const characterSearchRowSchema = z
  .object({
    serverId: z.string(),
    characterId: z.string(),
    characterName: z.string(),
    level: z.number(),
    jobId: z.string(),
    jobGrowId: z.string(),
    jobName: z.string(),
    jobGrowName: z.string(),
    fame: z.number().optional(),
  })
  .passthrough();
export type CharacterSearchRow = z.infer<typeof characterSearchRowSchema>;

export const characterSearchSchema = z
  .object({
    rows: z.array(characterSearchRowSchema),
  })
  .passthrough();
export type CharacterSearch = z.infer<typeof characterSearchSchema>;

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export const buffEntrySchema = z
  .object({
    name: z.string(),
    level: z.number().optional(),
    status: z.array(statEntrySchema).optional(),
  })
  .passthrough();
export type BuffEntry = z.infer<typeof buffEntrySchema>;

export const statusSchema = characterBaseSchema.extend({
  buff: z.array(buffEntrySchema),
  status: z.array(statEntrySchema),
});
export type Status = z.infer<typeof statusSchema>;

// ---------------------------------------------------------------------------
// Equipment (deep/variable -> keep gear rows permissive)
// ---------------------------------------------------------------------------

export const equipmentSchema = characterBaseSchema.extend({
  equipment: z.array(z.record(z.string(), z.unknown())),
  setItemInfo: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type Equipment = z.infer<typeof equipmentSchema>;

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

export const avatarSchema = characterBaseSchema.extend({
  avatar: z.array(z.record(z.string(), z.unknown())),
});
export type Avatar = z.infer<typeof avatarSchema>;

// ---------------------------------------------------------------------------
// Creature
// ---------------------------------------------------------------------------

export const creatureSchema = characterBaseSchema.extend({
  creature: z.record(z.string(), z.unknown()).nullable(),
});
export type Creature = z.infer<typeof creatureSchema>;

// ---------------------------------------------------------------------------
// Flag
// ---------------------------------------------------------------------------

export const flagSchema = characterBaseSchema.extend({
  flag: z.record(z.string(), z.unknown()).nullable(),
});
export type Flag = z.infer<typeof flagSchema>;

// ---------------------------------------------------------------------------
// Mist Assimilation
// ---------------------------------------------------------------------------

export const mistAssimilationStatusSchema = z
  .object({
    level: z.number().optional(),
    expRate: z.string().optional(),
    status: z.array(statEntrySchema).optional(),
  })
  .passthrough();

export const mistAssimilationSchema = characterBaseSchema.extend({
  mistAssimilation: mistAssimilationStatusSchema.nullable(),
});
export type MistAssimilation = z.infer<typeof mistAssimilationSchema>;

// ---------------------------------------------------------------------------
// Skill style
// ---------------------------------------------------------------------------

export const skillStyleEntrySchema = z
  .object({
    skillId: z.string(),
    name: z.string(),
    level: z.number().optional(),
    requiredLevel: z.number().optional(),
  })
  .passthrough();

export const skillStyleSchema = characterBaseSchema.extend({
  skill: z
    .object({
      hash: z.string().optional(),
      style: z.record(z.string(), z.unknown()),
    })
    .passthrough(),
});
export type SkillStyle = z.infer<typeof skillStyleSchema>;

// ---------------------------------------------------------------------------
// Buff enhance (skill/buff/equip/{equipment,avatar,creature})
// ---------------------------------------------------------------------------

export const buffSkillInfoSchema = z
  .object({
    skillId: z.string(),
    name: z.string(),
    option: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

/** Buff enhance shares one envelope across equip/avatar/creature variants.
 *  The inner `buff` object always carries `skillInfo`, plus one of the gear
 *  arrays — all kept permissive since they mirror the deep equipment blobs. */
export const buffEnhanceSchema = characterBaseSchema.extend({
  skill: z
    .object({
      buff: z
        .object({
          skillInfo: buffSkillInfoSchema.nullable(),
          equipment: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
          avatar: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
          creature: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
        })
        .passthrough()
        .nullable(),
    })
    .passthrough(),
});
export type BuffEnhance = z.infer<typeof buffEnhanceSchema>;

// ---------------------------------------------------------------------------
// Jobs (recursive jobGrow chain via `next`)
// ---------------------------------------------------------------------------

export interface JobGrow {
  readonly jobGrowId: string;
  readonly jobGrowName: string;
  readonly next?: JobGrow | null;
}

export const jobGrowSchema: z.ZodType<JobGrow> = z.lazy(() =>
  z
    .object({
      jobGrowId: z.string(),
      jobGrowName: z.string(),
      next: jobGrowSchema.nullable().optional(),
    })
    .passthrough(),
);

export const jobEntrySchema = z
  .object({
    jobId: z.string(),
    jobName: z.string(),
    rows: z.array(jobGrowSchema),
  })
  .passthrough();
export type JobEntry = z.infer<typeof jobEntrySchema>;

export const jobsSchema = z
  .object({
    rows: z.array(jobEntrySchema),
  })
  .passthrough();
export type Jobs = z.infer<typeof jobsSchema>;

// ---------------------------------------------------------------------------
// Skill list (/df/skills/{jobId}?jobGrowId=...)
// ---------------------------------------------------------------------------

export const skillListEntrySchema = z
  .object({
    skillId: z.string(),
    name: z.string(),
    requiredLevel: z.number().optional(),
    type: z.string().optional(),
  })
  .passthrough();
export type SkillListEntry = z.infer<typeof skillListEntrySchema>;

export const skillListSchema = z
  .object({
    skills: z.array(skillListEntrySchema),
  })
  .passthrough();
export type SkillList = z.infer<typeof skillListSchema>;

// ---------------------------------------------------------------------------
// Item detail (/df/items/{itemId})
// ---------------------------------------------------------------------------

export const itemSchema = z
  .object({
    itemId: z.string(),
    itemName: z.string(),
    itemRarity: z.string(),
    itemType: z.string().optional(),
    itemTypeId: z.string().optional(),
    itemTypeDetail: z.string().optional(),
    itemTypeDetailId: z.string().optional(),
    itemAvailableLevel: z.number().optional(),
    fame: z.number().optional(),
    setItemId: z.string().nullable().optional(),
    setItemName: z.string().nullable().optional(),
    itemStatus: z.array(statEntrySchema).optional(),
  })
  .passthrough();
export type Item = z.infer<typeof itemSchema>;

// ---------------------------------------------------------------------------
// Error envelope (4xx) — shared with client.ts
// ---------------------------------------------------------------------------

export const errorEnvelopeSchema = z.object({
  error: z.object({
    status: z.number(),
    code: z.string(),
    message: z.string(),
  }),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
