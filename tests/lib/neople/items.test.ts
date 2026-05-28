import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import itemFixture from "@/tests/fixtures/neople/item.json";

// Mutable holders the mocked db reads from / writes to. Each test resets them.
let selectRows: unknown[] = [];
const insertSpy = vi.fn();
const onConflictSpy = vi.fn(async () => undefined);

// Mock the drizzle db: select chain returns `selectRows`, insert chain records
// the upsert so we can assert a row was written on cache miss.
vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => selectRows,
        }),
      }),
    }),
    insert: (...args: unknown[]) => {
      insertSpy(...args);
      return {
        values: (...vals: unknown[]) => {
          insertSpy(...vals);
          return { onConflictDoUpdate: onConflictSpy };
        },
      };
    },
  },
}));

import { getItem, ITEM_TTL_MS } from "@/lib/neople/items";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("getItem", () => {
  beforeEach(() => {
    process.env.DFO_API_KEY = "test-key-123";
    selectRows = [];
    insertSpy.mockClear();
    onConflictSpy.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DFO_API_KEY;
  });

  it("cache MISS: fetches from the API and writes a row", async () => {
    selectRows = []; // no cached row
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(itemFixture));

    const result = await getItem(itemFixture.itemId);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(`/df/items/${itemFixture.itemId}`);
    expect(result.itemId).toBe(itemFixture.itemId);
    // A row was upserted with a JSON payload + fetchedAt timestamp.
    expect(onConflictSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalled();
  });

  it("cache HIT: returns the cached payload without calling fetch", async () => {
    selectRows = [
      {
        itemId: itemFixture.itemId,
        payload: JSON.stringify(itemFixture),
        fetchedAt: Date.now(),
      },
    ];
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await getItem(itemFixture.itemId);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.itemId).toBe(itemFixture.itemId);
    expect(onConflictSpy).not.toHaveBeenCalled();
  });

  it("stale cache: re-fetches when fetchedAt is older than the TTL", async () => {
    selectRows = [
      {
        itemId: itemFixture.itemId,
        payload: JSON.stringify(itemFixture),
        fetchedAt: Date.now() - ITEM_TTL_MS - 1,
      },
    ];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(itemFixture));

    await getItem(itemFixture.itemId);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(onConflictSpy).toHaveBeenCalledTimes(1);
  });
});
