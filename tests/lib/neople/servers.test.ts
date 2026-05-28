import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getServers } from "@/lib/neople/servers";

const FIXTURE_DIR = join(process.cwd(), "tests/fixtures/neople");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf-8"));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("getServers", () => {
  beforeEach(() => {
    process.env.DFO_API_KEY = "test-key-123";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DFO_API_KEY;
  });

  it("calls /df/servers with the apikey and returns parsed rows", async () => {
    const fixture = loadFixture("servers.json");
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(jsonResponse(fixture));

    const result = await getServers();

    const calledUrl = String(fetchSpy.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("https://api.dfoneople.com/df/servers?");
    expect(calledUrl).toContain("apikey=test-key-123");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.serverId).toBe("cain");
    expect(result.rows[0]?.serverName).toBe("Cain");
  });
});
