import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// --- DB mock state ---
let charRows: unknown[] = [];
let fameRows: unknown[] = [];
let gearRows: unknown[] = [];
let statusRows: unknown[] = [];
let lockRunRows: unknown[] = [];

const insertFameSpy = vi.fn();
const insertGearSpy = vi.fn();
const insertStatusSpy = vi.fn();
const updateCharSpy = vi.fn();
const deleteLockSpy = vi.fn();

// Drizzle query builder chains are deeply nested; build minimal fakes.
function makeSelectChain(getRows: () => unknown[]) {
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: async () => getRows(),
    select: () => chain,
  };
  return chain;
}

const txMock = {
  insert: (table: unknown) => ({
    values: (vals: unknown) => {
      // Route by which table object is passed
      if (table === fameSnapshotRef) insertFameSpy(vals);
      else if (table === gearSnapshotRef) insertGearSpy(vals);
      else if (table === statusSnapshotRef) insertStatusSpy(vals);
      return Promise.resolve();
    },
  }),
  update: () => ({
    set: (vals: unknown) => {
      updateCharSpy(vals);
      return {
        where: () => Promise.resolve(),
      };
    },
  }),
};

// We need references to the schema table objects so txMock can route by identity.
// These are set after the mock is established, in beforeEach.
let fameSnapshotRef: unknown = null;
let gearSnapshotRef: unknown = null;
let statusSnapshotRef: unknown = null;

vi.mock("@/db", () => ({
  db: {
    select: () => {
      // returns a chain; actual row source determined by .from() then .where()
      // We build one chain that returns based on the last .from() table called.
      let tableRef: unknown = null;
      const chain = {
        from: (t: unknown) => {
          tableRef = t;
          return chain;
        },
        where: () => chain,
        orderBy: () => chain,
        limit: async () => {
          if (tableRef === fameSnapshotRef) return fameRows;
          if (tableRef === gearSnapshotRef) return gearRows;
          if (tableRef === statusSnapshotRef) return statusRows;
          return charRows; // characters table fallback
        },
      };
      return chain;
    },
    run: async () => ({ rows: lockRunRows }),
    delete: () => ({
      where: async () => {
        deleteLockSpy();
      },
    }),
    transaction: async (fn: (tx: typeof txMock) => Promise<void>) => {
      await fn(txMock);
    },
  },
}));

// Neople helpers mock
const mockGetCharacter = vi.fn();
const mockGetStatus = vi.fn();
const mockGetEquipment = vi.fn();
const mockGetAvatar = vi.fn();
const mockGetCreature = vi.fn();
const mockGetFlag = vi.fn();
const mockGetMistAssimilation = vi.fn();
const mockGetBuffEquipment = vi.fn();
const mockGetBuffAvatar = vi.fn();
const mockGetBuffCreature = vi.fn();

vi.mock("@/lib/neople/characters", () => ({
  getCharacter: (...args: unknown[]) => mockGetCharacter(...args),
  getStatus: (...args: unknown[]) => mockGetStatus(...args),
  getEquipment: (...args: unknown[]) => mockGetEquipment(...args),
  getAvatar: (...args: unknown[]) => mockGetAvatar(...args),
  getCreature: (...args: unknown[]) => mockGetCreature(...args),
  getFlag: (...args: unknown[]) => mockGetFlag(...args),
  getMistAssimilation: (...args: unknown[]) => mockGetMistAssimilation(...args),
  getBuffEquipment: (...args: unknown[]) => mockGetBuffEquipment(...args),
  getBuffAvatar: (...args: unknown[]) => mockGetBuffAvatar(...args),
  getBuffCreature: (...args: unknown[]) => mockGetBuffCreature(...args),
}));

import {
  snapshotCharacter,
  getFameHistory,
  getLatestGearSnapshot,
  getLatestStatusSnapshot,
} from "@/lib/snapshot";
import {
  fameSnapshot,
  gearSnapshot,
  statusSnapshot,
} from "@/db/schema";

const CHAR_ROW = {
  id: "char-1",
  serverId: "cain",
  characterId: "abc123",
  characterName: "TestChar",
  adventureName: "OldAdventure",
  jobId: "job1",
  jobGrowId: "grow1",
  jobName: "OldJob",
  level: 99,
  guildName: null,
  guideUrls: null,
  createdAt: 1000,
  updatedAt: 1000,
};

const BASE_RESPONSE = { fame: 5000, level: 110, jobName: "Ranger", adventureName: "NewAdventure" };
const STATUS_RESPONSE = { status: { hp: 100 }, buff: { atk: 200 } };
const EQUIPMENT_RESPONSE = { slots: [] };
const AVATAR_RESPONSE = { avatars: [] };
const CREATURE_RESPONSE = { creature: null };
const FLAG_RESPONSE = { flag: null };
const MIST_RESPONSE = { mist: [] };
const BUFF_EQUIP_RESPONSE = { buffEquip: [] };
const BUFF_AVATAR_RESPONSE = { buffAvatar: [] };
const BUFF_CREATURE_RESPONSE = { buffCreature: null };

function allHelpersFulfilled() {
  mockGetCharacter.mockResolvedValue(BASE_RESPONSE);
  mockGetStatus.mockResolvedValue(STATUS_RESPONSE);
  mockGetEquipment.mockResolvedValue(EQUIPMENT_RESPONSE);
  mockGetAvatar.mockResolvedValue(AVATAR_RESPONSE);
  mockGetCreature.mockResolvedValue(CREATURE_RESPONSE);
  mockGetFlag.mockResolvedValue(FLAG_RESPONSE);
  mockGetMistAssimilation.mockResolvedValue(MIST_RESPONSE);
  mockGetBuffEquipment.mockResolvedValue(BUFF_EQUIP_RESPONSE);
  mockGetBuffAvatar.mockResolvedValue(BUFF_AVATAR_RESPONSE);
  mockGetBuffCreature.mockResolvedValue(BUFF_CREATURE_RESPONSE);
}

describe("snapshotCharacter", () => {
  beforeEach(() => {
    // Wire schema table references so the mock can route by identity
    fameSnapshotRef = fameSnapshot;
    gearSnapshotRef = gearSnapshot;
    statusSnapshotRef = statusSnapshot;

    charRows = [CHAR_ROW];
    fameRows = [];
    gearRows = [];
    statusRows = [];
    lockRunRows = [{ character_fk: "char-1" }]; // lock acquired by default

    insertFameSpy.mockClear();
    insertGearSpy.mockClear();
    insertStatusSpy.mockClear();
    updateCharSpy.mockClear();
    deleteLockSpy.mockClear();
    vi.clearAllMocks();

    // Re-set defaults after clearAllMocks
    lockRunRows = [{ character_fk: "char-1" }];
    charRows = [CHAR_ROW];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("happy path: all helpers fulfilled → inserts fame/gear/status, updates character, returns ok:true", async () => {
    allHelpersFulfilled();

    const result = await snapshotCharacter("char-1");

    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.errors).toBeUndefined();

    expect(insertFameSpy).toHaveBeenCalledOnce();
    expect(insertFameSpy).toHaveBeenCalledWith(
      expect.objectContaining({ characterFk: "char-1", fame: 5000, level: 110 }),
    );

    expect(insertGearSpy).toHaveBeenCalledOnce();
    expect(insertGearSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        characterFk: "char-1",
        equipment: JSON.stringify(EQUIPMENT_RESPONSE),
        avatar: JSON.stringify(AVATAR_RESPONSE),
      }),
    );

    expect(insertStatusSpy).toHaveBeenCalledOnce();
    expect(insertStatusSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        characterFk: "char-1",
        status: JSON.stringify(STATUS_RESPONSE.status),
        buff: JSON.stringify(STATUS_RESPONSE.buff),
      }),
    );

    expect(updateCharSpy).toHaveBeenCalledOnce();
    expect(updateCharSpy).toHaveBeenCalledWith(
      expect.objectContaining({ level: 110, jobName: "Ranger", adventureName: "NewAdventure" }),
    );

    // Lock released in finally
    expect(deleteLockSpy).toHaveBeenCalledOnce();
  });

  it("one endpoint rejects → its name appears in errors, other data still saved, ok:true", async () => {
    allHelpersFulfilled();
    mockGetEquipment.mockRejectedValue(new Error("network error"));

    const result = await snapshotCharacter("char-1");

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual(["getEquipment"]);

    expect(insertFameSpy).toHaveBeenCalledOnce();
    expect(insertGearSpy).toHaveBeenCalledOnce();
    // equipment should be null since it failed
    expect(insertGearSpy).toHaveBeenCalledWith(
      expect.objectContaining({ equipment: null }),
    );
    expect(insertStatusSpy).toHaveBeenCalledOnce();
  });

  it("lock held → returns {ok:false, reason:'locked'}, no inserts", async () => {
    lockRunRows = []; // lock not acquired

    // Need to re-mock db.run to return empty rows
    // The vi.mock is module-level, so we adjust lockRunRows which db.run reads
    allHelpersFulfilled();

    const result = await snapshotCharacter("char-1");

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("locked");
    expect(insertFameSpy).not.toHaveBeenCalled();
    expect(insertGearSpy).not.toHaveBeenCalled();
    expect(insertStatusSpy).not.toHaveBeenCalled();
  });

  it("character not found → returns {ok:false, reason:'not_found'}", async () => {
    charRows = []; // no character in db
    allHelpersFulfilled();

    const result = await snapshotCharacter("char-1");

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_found");
    expect(insertFameSpy).not.toHaveBeenCalled();
  });
});

describe("getFameHistory", () => {
  beforeEach(() => {
    fameSnapshotRef = fameSnapshot;
    gearSnapshotRef = gearSnapshot;
    statusSnapshotRef = statusSnapshot;
    vi.clearAllMocks();
    lockRunRows = [];
    charRows = [];
    fameRows = [];
    gearRows = [];
    statusRows = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ascending points (reversed from desc DB query)", async () => {
    // Simulating: DB returns desc order [300, 200, 100], we reverse to ascending
    fameRows = [
      { fame: 6000, level: 112, capturedAt: 3000 },
      { fame: 5500, level: 111, capturedAt: 2000 },
      { fame: 5000, level: 110, capturedAt: 1000 },
    ];

    const result = await getFameHistory("char-1");

    expect(result).toHaveLength(3);
    expect(result[0].capturedAt).toBe(1000);
    expect(result[1].capturedAt).toBe(2000);
    expect(result[2].capturedAt).toBe(3000);
    expect(result[0].fame).toBe(5000);
    expect(result[2].fame).toBe(6000);
  });

  it("returns empty array when no snapshots", async () => {
    fameRows = [];
    const result = await getFameHistory("char-1");
    expect(result).toEqual([]);
  });
});

describe("getLatestGearSnapshot", () => {
  beforeEach(() => {
    fameSnapshotRef = fameSnapshot;
    gearSnapshotRef = gearSnapshot;
    statusSnapshotRef = statusSnapshot;
    vi.clearAllMocks();
    lockRunRows = [];
    charRows = [];
    fameRows = [];
    gearRows = [];
    statusRows = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when no gear snapshots", async () => {
    gearRows = [];
    const result = await getLatestGearSnapshot("char-1");
    expect(result).toBeNull();
  });

  it("parses JSON columns and returns GearSnapshot", async () => {
    gearRows = [
      {
        equipment: JSON.stringify(EQUIPMENT_RESPONSE),
        avatar: JSON.stringify(AVATAR_RESPONSE),
        creature: null,
        flag: null,
        mistAssimilation: null,
        buffEquipment: null,
        buffAvatar: null,
        buffCreature: null,
        capturedAt: 9999,
      },
    ];

    const result = await getLatestGearSnapshot("char-1");

    expect(result).not.toBeNull();
    expect(result!.equipment).toEqual(EQUIPMENT_RESPONSE);
    expect(result!.avatar).toEqual(AVATAR_RESPONSE);
    expect(result!.creature).toBeNull();
    expect(result!.capturedAt).toBe(9999);
  });
});

describe("getLatestStatusSnapshot", () => {
  beforeEach(() => {
    fameSnapshotRef = fameSnapshot;
    gearSnapshotRef = gearSnapshot;
    statusSnapshotRef = statusSnapshot;
    vi.clearAllMocks();
    lockRunRows = [];
    charRows = [];
    fameRows = [];
    gearRows = [];
    statusRows = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when no status snapshots", async () => {
    statusRows = [];
    const result = await getLatestStatusSnapshot("char-1");
    expect(result).toBeNull();
  });

  it("parses JSON columns and returns StatusSnapshotData", async () => {
    statusRows = [
      {
        status: JSON.stringify(STATUS_RESPONSE.status),
        buff: JSON.stringify(STATUS_RESPONSE.buff),
        capturedAt: 8888,
      },
    ];

    const result = await getLatestStatusSnapshot("char-1");

    expect(result).not.toBeNull();
    expect(result!.status).toEqual(STATUS_RESPONSE.status);
    expect(result!.buff).toEqual(STATUS_RESPONSE.buff);
    expect(result!.capturedAt).toBe(8888);
  });
});
