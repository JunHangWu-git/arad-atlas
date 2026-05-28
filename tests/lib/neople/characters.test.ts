import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getAvatar,
  getBuffAvatar,
  getBuffCreature,
  getBuffEquipment,
  getCharacter,
  getCreature,
  getEquipment,
  getFlag,
  getMistAssimilation,
  getSkillStyle,
  getStatus,
  searchCharacter,
} from "@/lib/neople/characters";

const FIXTURE_DIR = join(process.cwd(), "tests/fixtures/neople");
const SERVER = "cain";
const CHAR_ID = "1a5a0b62c6c189e69a00248aa9f9d0b1";
const BASE = `https://api.dfoneople.com/df/servers/${SERVER}/characters/${CHAR_ID}`;

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf-8"));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockFetch(fixture: string): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(loadFixture(fixture)));
}

describe("character helpers", () => {
  beforeEach(() => {
    process.env.DFO_API_KEY = "test-key-123";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DFO_API_KEY;
  });

  it("searchCharacter builds the search URL with wordType=match and returns rows", async () => {
    const fetchSpy = mockFetch("search.json");
    const result = await searchCharacter(SERVER, "coo1guy");

    const url = String(fetchSpy.mock.calls[0]?.[0]);
    expect(url).toContain(`https://api.dfoneople.com/df/servers/${SERVER}/characters?`);
    expect(url).toContain("characterName=coo1guy");
    expect(url).toContain("wordType=match");
    expect(url).toContain("apikey=test-key-123");
    expect(result.rows[0]?.characterId).toBe(CHAR_ID);
  });

  it("getCharacter targets the base path and returns the identity envelope", async () => {
    const fetchSpy = mockFetch("character.json");
    const result = await getCharacter(SERVER, CHAR_ID);

    const url = String(fetchSpy.mock.calls[0]?.[0]);
    expect(url).toContain(`${BASE}?`);
    expect(url).toContain("apikey=test-key-123");
    expect(result.characterName).toBe("coo1guy");
    expect(result.level).toBe(115);
  });

  it("getStatus targets /status and returns buff + status", async () => {
    const fetchSpy = mockFetch("status.json");
    const result = await getStatus(SERVER, CHAR_ID);

    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(`${BASE}/status?`);
    expect(Array.isArray(result.status)).toBe(true);
    expect(Array.isArray(result.buff)).toBe(true);
  });

  it("getEquipment targets /equip/equipment", async () => {
    const fetchSpy = mockFetch("equipment.json");
    const result = await getEquipment(SERVER, CHAR_ID);

    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(`${BASE}/equip/equipment?`);
    expect(Array.isArray(result.equipment)).toBe(true);
  });

  it("getAvatar targets /equip/avatar", async () => {
    const fetchSpy = mockFetch("avatar.json");
    const result = await getAvatar(SERVER, CHAR_ID);

    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(`${BASE}/equip/avatar?`);
    expect(Array.isArray(result.avatar)).toBe(true);
  });

  it("getCreature targets /equip/creature", async () => {
    const fetchSpy = mockFetch("creature.json");
    const result = await getCreature(SERVER, CHAR_ID);

    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(`${BASE}/equip/creature?`);
    expect(result.characterId).toBe(CHAR_ID);
  });

  it("getFlag targets /equip/flag", async () => {
    const fetchSpy = mockFetch("flag.json");
    const result = await getFlag(SERVER, CHAR_ID);

    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(`${BASE}/equip/flag?`);
    expect(result.characterId).toBe(CHAR_ID);
  });

  it("getMistAssimilation targets /equip/mist-assimilation", async () => {
    const fetchSpy = mockFetch("mist.json");
    const result = await getMistAssimilation(SERVER, CHAR_ID);

    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(`${BASE}/equip/mist-assimilation?`);
    expect(result.mistAssimilation?.level).toBe(1);
  });

  it("getSkillStyle targets /skill/style", async () => {
    const fetchSpy = mockFetch("skillstyle.json");
    const result = await getSkillStyle(SERVER, CHAR_ID);

    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(`${BASE}/skill/style?`);
    expect(result.characterId).toBe(CHAR_ID);
  });

  it("getBuffEquipment targets /skill/buff/equip/equipment", async () => {
    const fetchSpy = mockFetch("buffequip.json");
    const result = await getBuffEquipment(SERVER, CHAR_ID);

    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(`${BASE}/skill/buff/equip/equipment?`);
    expect(result.characterId).toBe(CHAR_ID);
  });

  it("getBuffAvatar targets /skill/buff/equip/avatar", async () => {
    const fetchSpy = mockFetch("buffavatar.json");
    const result = await getBuffAvatar(SERVER, CHAR_ID);

    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(`${BASE}/skill/buff/equip/avatar?`);
    expect(result.characterId).toBe(CHAR_ID);
  });

  it("getBuffCreature targets /skill/buff/equip/creature", async () => {
    const fetchSpy = mockFetch("buffcreature.json");
    const result = await getBuffCreature(SERVER, CHAR_ID);

    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(`${BASE}/skill/buff/equip/creature?`);
    expect(result.characterId).toBe(CHAR_ID);
  });
});
