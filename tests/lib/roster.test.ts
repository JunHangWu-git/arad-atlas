import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// --- DB mock state ---
let charRows: unknown[] = [];
let fameRunRows: unknown[] = [];

// Select chain that is itself awaitable (resolves to charRows), so callers that
// end at `.orderBy()` (listRoster) and callers that end at `.limit()` both work.
vi.mock("@/db", () => {
  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    const ret = () => chain;
    chain.from = ret;
    chain.where = ret;
    chain.orderBy = ret;
    chain.limit = async () => charRows;
    chain.then = (resolve: (v: unknown) => unknown) => resolve(charRows);
    return chain;
  };
  return {
    db: {
      select: () => makeChain(),
      run: async () => ({ rows: fameRunRows }),
    },
  };
});

// roster.ts + snapshot.ts both import from this module.
vi.mock("@/lib/neople/characters", () => ({
  searchCharacter: vi.fn(),
  getCharacter: vi.fn(),
  getStatus: vi.fn(),
  getEquipment: vi.fn(),
  getAvatar: vi.fn(),
  getCreature: vi.fn(),
  getFlag: vi.fn(),
  getMistAssimilation: vi.fn(),
  getBuffEquipment: vi.fn(),
  getBuffAvatar: vi.fn(),
  getBuffCreature: vi.fn(),
}));

import { listRosterWithFame } from "@/lib/roster";
import { getLatestFameByCharacter } from "@/lib/snapshot";

const CHAR_ROW = {
  id: "cain-abc",
  serverId: "cain",
  characterId: "abc",
  characterName: "TestChar",
  adventureName: null,
  jobId: null,
  jobGrowId: null,
  jobName: "Ranger",
  level: 110,
  guildName: null,
  guideUrls: "[]",
  createdAt: 1000,
  updatedAt: 2000,
};

describe("getLatestFameByCharacter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    charRows = [];
    fameRunRows = [];
  });
  afterEach(() => vi.restoreAllMocks());

  it("maps latest fame per character", async () => {
    fameRunRows = [
      { characterFk: "cain-abc", fame: 48200 },
      { characterFk: "cain-def", fame: 51000 },
    ];
    const map = await getLatestFameByCharacter();
    expect(map.get("cain-abc")).toBe(48200);
    expect(map.get("cain-def")).toBe(51000);
    expect(map.size).toBe(2);
  });

  it("returns empty map when no fame rows", async () => {
    fameRunRows = [];
    const map = await getLatestFameByCharacter();
    expect(map.size).toBe(0);
  });

  it("coerces non-numeric/missing fame to null and skips non-string keys", async () => {
    fameRunRows = [
      { characterFk: "cain-abc", fame: null },
      { characterFk: 123, fame: 5 },
    ];
    const map = await getLatestFameByCharacter();
    expect(map.get("cain-abc")).toBeNull();
    expect(map.has("123")).toBe(false);
    expect(map.size).toBe(1);
  });
});

describe("listRosterWithFame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    charRows = [CHAR_ROW];
    fameRunRows = [];
  });
  afterEach(() => vi.restoreAllMocks());

  it("merges latest fame onto roster characters", async () => {
    fameRunRows = [{ characterFk: "cain-abc", fame: 48200 }];
    const roster = await listRosterWithFame();
    expect(roster).toHaveLength(1);
    expect(roster[0].id).toBe("cain-abc");
    expect(roster[0].fame).toBe(48200);
    expect(roster[0].jobName).toBe("Ranger");
  });

  it("defaults fame to null when a character has no snapshot", async () => {
    fameRunRows = [];
    const roster = await listRosterWithFame();
    expect(roster[0].fame).toBeNull();
  });
});
