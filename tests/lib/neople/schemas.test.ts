import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  avatarSchema,
  buffEnhanceSchema,
  characterSearchSchema,
  creatureSchema,
  equipmentSchema,
  flagSchema,
  itemSchema,
  jobsSchema,
  mistAssimilationSchema,
  serverListSchema,
  skillListSchema,
  skillStyleSchema,
  statusSchema,
} from "@/lib/neople/schemas";
import type { ZodType } from "zod";

const FIXTURE_DIR = join(process.cwd(), "tests", "fixtures", "neople");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, `${name}.json`), "utf-8"));
}

const cases: ReadonlyArray<readonly [string, ZodType<unknown>]> = [
  ["servers", serverListSchema],
  ["search", characterSearchSchema],
  ["status", statusSchema],
  ["equipment", equipmentSchema],
  ["avatar", avatarSchema],
  ["creature", creatureSchema],
  ["flag", flagSchema],
  ["mist", mistAssimilationSchema],
  ["skillstyle", skillStyleSchema],
  ["buffequip", buffEnhanceSchema],
  ["buffavatar", buffEnhanceSchema],
  ["buffcreature", buffEnhanceSchema],
  ["jobs", jobsSchema],
  ["skills", skillListSchema],
  ["item", itemSchema],
];

describe("neople schemas parse real fixtures", () => {
  it.each(cases)("%s fixture matches its schema", (name, schema) => {
    const fixture = loadFixture(name);
    const result = schema.safeParse(fixture);
    if (!result.success) {
      throw new Error(
        `Schema parse failed for ${name}: ${JSON.stringify(result.error.issues, null, 2)}`,
      );
    }
    expect(result.success).toBe(true);
  });
});
