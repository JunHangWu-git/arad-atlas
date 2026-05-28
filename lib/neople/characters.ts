import "server-only";

import { neopleFetch } from "./client";
import {
  avatarSchema,
  buffEnhanceSchema,
  characterBaseSchema,
  characterSearchSchema,
  creatureSchema,
  equipmentSchema,
  flagSchema,
  mistAssimilationSchema,
  skillStyleSchema,
  statusSchema,
  type Avatar,
  type BuffEnhance,
  type CharacterBase,
  type CharacterSearch,
  type Creature,
  type Equipment,
  type Flag,
  type MistAssimilation,
  type SkillStyle,
  type Status,
} from "./schemas";

/**
 * Server-only character-scoped helpers for the Neople DFO Global API.
 *
 * Paths and the `wordType=match` search contract are derived from the live
 * probe (.omc/research/neople-api-probe-2026-05-27.md). `getTalisman` and
 * `getTimeline` are intentionally absent — both 404 on the Global API.
 */

const CHARACTERS_BASE = "/df/servers";

function characterPath(server: string, characterId: string): string {
  return `${CHARACTERS_BASE}/${server}/characters/${characterId}`;
}

/** Search characters by exact name (`wordType=match`). */
export async function searchCharacter(server: string, name: string): Promise<CharacterSearch> {
  return neopleFetch(
    `${CHARACTERS_BASE}/${server}/characters`,
    { characterName: name, wordType: "match" },
    characterSearchSchema,
  );
}

/** Fetch a character's base identity envelope. */
export async function getCharacter(server: string, characterId: string): Promise<CharacterBase> {
  return neopleFetch(characterPath(server, characterId), undefined, characterBaseSchema);
}

/** Fetch a character's status (base + buff + status). */
export async function getStatus(server: string, characterId: string): Promise<Status> {
  return neopleFetch(`${characterPath(server, characterId)}/status`, undefined, statusSchema);
}

/** Fetch a character's equipped gear. */
export async function getEquipment(server: string, characterId: string): Promise<Equipment> {
  return neopleFetch(
    `${characterPath(server, characterId)}/equip/equipment`,
    undefined,
    equipmentSchema,
  );
}

/** Fetch a character's avatars. */
export async function getAvatar(server: string, characterId: string): Promise<Avatar> {
  return neopleFetch(`${characterPath(server, characterId)}/equip/avatar`, undefined, avatarSchema);
}

/** Fetch a character's creature. */
export async function getCreature(server: string, characterId: string): Promise<Creature> {
  return neopleFetch(
    `${characterPath(server, characterId)}/equip/creature`,
    undefined,
    creatureSchema,
  );
}

/** Fetch a character's guild flag. */
export async function getFlag(server: string, characterId: string): Promise<Flag> {
  return neopleFetch(`${characterPath(server, characterId)}/equip/flag`, undefined, flagSchema);
}

/** Fetch a character's mist assimilation (Global API's talisman/rune replacement). */
export async function getMistAssimilation(
  server: string,
  characterId: string,
): Promise<MistAssimilation> {
  return neopleFetch(
    `${characterPath(server, characterId)}/equip/mist-assimilation`,
    undefined,
    mistAssimilationSchema,
  );
}

/** Fetch a character's skill style. */
export async function getSkillStyle(server: string, characterId: string): Promise<SkillStyle> {
  return neopleFetch(
    `${characterPath(server, characterId)}/skill/style`,
    undefined,
    skillStyleSchema,
  );
}

/** Fetch a character's buff-skill equipment enhancement. */
export async function getBuffEquipment(
  server: string,
  characterId: string,
): Promise<BuffEnhance> {
  return neopleFetch(
    `${characterPath(server, characterId)}/skill/buff/equip/equipment`,
    undefined,
    buffEnhanceSchema,
  );
}

/** Fetch a character's buff-skill avatar enhancement. */
export async function getBuffAvatar(server: string, characterId: string): Promise<BuffEnhance> {
  return neopleFetch(
    `${characterPath(server, characterId)}/skill/buff/equip/avatar`,
    undefined,
    buffEnhanceSchema,
  );
}

/** Fetch a character's buff-skill creature enhancement. */
export async function getBuffCreature(server: string, characterId: string): Promise<BuffEnhance> {
  return neopleFetch(
    `${characterPath(server, characterId)}/skill/buff/equip/creature`,
    undefined,
    buffEnhanceSchema,
  );
}
