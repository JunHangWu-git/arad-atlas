import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
// Note: primaryKey is used for skill_cache composite PK

export const characters = sqliteTable(
  "characters",
  {
    id: text("id").primaryKey(),
    serverId: text("server_id").notNull(),
    characterId: text("character_id").notNull(),
    characterName: text("character_name").notNull(),
    adventureName: text("adventure_name"),
    jobId: text("job_id"),
    jobGrowId: text("job_grow_id"),
    jobName: text("job_name"),
    jobGrowName: text("job_grow_name"),
    level: integer("level"),
    guildName: text("guild_name"),
    guideUrls: text("guide_urls"), // JSON-encoded string[]
    position: integer("position"), // manual board sort order (asc); null = unsorted
    createdAt: integer("created_at"), // unix ms
    updatedAt: integer("updated_at"), // unix ms
  },
  (t) => [
    uniqueIndex("characters_server_char_uniq").on(t.serverId, t.characterId),
    index("characters_position_created_idx").on(t.position, t.createdAt),
  ]
);

export const fameSnapshot = sqliteTable(
  "fame_snapshot",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterFk: text("character_fk").references(() => characters.id, {
      onDelete: "cascade",
    }),
    fame: integer("fame"),
    level: integer("level"),
    capturedAt: integer("captured_at").notNull(), // unix ms
  },
  (t) => [
    index("fame_snapshot_char_captured_idx").on(t.characterFk, t.capturedAt),
    index("fame_snapshot_char_captured_fame_idx").on(t.characterFk, t.capturedAt, t.fame),
  ]
);

export const gearSnapshot = sqliteTable(
  "gear_snapshot",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterFk: text("character_fk").references(() => characters.id, {
      onDelete: "cascade",
    }),
    equipment: text("equipment"), // JSON
    avatar: text("avatar"), // JSON
    creature: text("creature"), // JSON
    flag: text("flag"), // JSON
    mistAssimilation: text("mist_assimilation"), // JSON
    talisman: text("talisman"), // JSON (nullable)
    buffEquipment: text("buff_equipment"), // JSON
    buffAvatar: text("buff_avatar"), // JSON
    buffCreature: text("buff_creature"), // JSON
    capturedAt: integer("captured_at").notNull(), // unix ms
  },
  (t) => [index("gear_snapshot_char_captured_idx").on(t.characterFk, t.capturedAt)]
);

export const statusSnapshot = sqliteTable(
  "status_snapshot",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterFk: text("character_fk").references(() => characters.id, {
      onDelete: "cascade",
    }),
    status: text("status"), // JSON
    buff: text("buff"), // JSON
    capturedAt: integer("captured_at").notNull(), // unix ms
  },
  (t) => [index("status_snapshot_char_captured_idx").on(t.characterFk, t.capturedAt)]
);

export const itemCache = sqliteTable("item_cache", {
  itemId: text("item_id").primaryKey(),
  payload: text("payload"), // JSON
  fetchedAt: integer("fetched_at"), // unix ms
});

export const jobCache = sqliteTable("job_cache", {
  jobId: text("job_id").primaryKey(),
  payload: text("payload"), // JSON
  fetchedAt: integer("fetched_at"), // unix ms
});

export const skillCache = sqliteTable(
  "skill_cache",
  {
    jobId: text("job_id").notNull(),
    skillId: text("skill_id").notNull(),
    payload: text("payload"), // JSON
    fetchedAt: integer("fetched_at"), // unix ms
  },
  (t) => [primaryKey({ columns: [t.jobId, t.skillId] })]
);

export const guideCache = sqliteTable(
  "guide_cache",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterFk: text("character_fk").references(() => characters.id, {
      onDelete: "cascade",
    }),
    source: text("source"), // 'dfo.gg' | 'dfoworld.kr'
    url: text("url").notNull(),
    title: text("title"),
    summary: text("summary"),
    fetchedAt: integer("fetched_at").notNull(), // unix ms
  },
  (t) => [index("guide_cache_char_source_idx").on(t.characterFk, t.source)]
);

export const snapshotLock = sqliteTable("snapshot_lock", {
  characterFk: text("character_fk").primaryKey(),
  expiresAt: integer("expires_at").notNull(), // unix ms
});

// Manual, user-editable progression annotations per character. The progression
// matrix derives most columns automatically from gear/fame snapshots; these two
// fields are the human judgment the spreadsheet kept by hand (优先度 / 提升).
export const progressionNote = sqliteTable("progression_note", {
  characterFk: text("character_fk")
    .primaryKey()
    .references(() => characters.id, { onDelete: "cascade" }),
  priority: integer("priority"), // manual rank; lower = higher priority, null = unset
  note: text("note"), // freeform "what to improve next" text
  updatedAt: integer("updated_at"), // unix ms
});
