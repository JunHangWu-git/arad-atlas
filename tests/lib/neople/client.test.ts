import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import { NeopleError, neopleFetch } from "@/lib/neople/client";
import { createLimiter } from "@/lib/neople/limiter";

// A fast limiter so retry tests do not rate-limit themselves into slowness.
const fastLimiter = createLimiter({ ratePerSec: 100000 });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("neopleFetch", () => {
  beforeEach(() => {
    process.env.DFO_API_KEY = "test-key-123";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DFO_API_KEY;
  });

  it("throws a clear error when DFO_API_KEY is unset", async () => {
    delete process.env.DFO_API_KEY;
    const fetchImpl = vi.fn();
    await expect(
      neopleFetch("/df/servers", {}, undefined, { fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow(/DFO_API_KEY/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("injects the apikey and encodes query params", async () => {
    const fetchImpl = vi.fn(async (_url: unknown) => jsonResponse({ rows: [] }));
    await neopleFetch(
      "/df/servers/cain/characters",
      { characterName: "coo1 guy", wordType: "match" },
      undefined,
      { limiter: fastLimiter, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchImpl.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("apikey=test-key-123");
    expect(calledUrl).toContain("characterName=coo1+guy");
    expect(calledUrl).toContain("wordType=match");
    expect(calledUrl.startsWith("https://api.dfoneople.com/df/servers/cain/characters?")).toBe(
      true,
    );
  });

  it("retries on 5xx then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 503))
      .mockResolvedValueOnce(jsonResponse({ rows: [{ serverId: "cain" }] }, 200));

    const result = await neopleFetch<{ rows: unknown[] }>(
      "/df/servers",
      {},
      undefined,
      { limiter: fastLimiter, fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.rows).toHaveLength(1);
  });

  it("throws NeopleError with code parsed from the DNF envelope on 4xx", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        { error: { status: 400, code: "DNF901", message: "NOT_FOUND_SEARCH_VALUE" } },
        400,
      ),
    );

    let caught: unknown;
    try {
      await neopleFetch("/df/skills/abc", {}, undefined, {
        limiter: fastLimiter,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(NeopleError);
    const error = caught as NeopleError;
    expect(error.status).toBe(400);
    expect(error.code).toBe("DNF901");
    expect(error.path).toBe("/df/skills/abc");
    // 4xx must not be retried.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("logs a warning and returns raw data when schema parsing fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const schema = z.object({ rows: z.array(z.object({ serverId: z.string() })) });
    const raw = { rows: [{ serverId: 123 }] }; // serverId wrong type -> parse fails
    const fetchImpl = vi.fn(async () => jsonResponse(raw));

    const result = await neopleFetch(
      "/df/servers",
      {},
      schema,
      { limiter: fastLimiter, fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain("schema validation failed");
    expect(result).toEqual(raw);
  });

  it("returns parsed data when schema parsing succeeds", async () => {
    const schema = z.object({ rows: z.array(z.object({ serverId: z.string() })) });
    const raw = { rows: [{ serverId: "cain" }] };
    const fetchImpl = vi.fn(async () => jsonResponse(raw));

    const result = await neopleFetch(
      "/df/servers",
      {},
      schema,
      { limiter: fastLimiter, fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(result).toEqual(raw);
  });
});
