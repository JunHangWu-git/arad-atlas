import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import jobsFixture from "@/tests/fixtures/neople/jobs.json";
import skillsFixture from "@/tests/fixtures/neople/skills.json";

import { getJobs, getSkills } from "@/lib/neople/jobs";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("getJobs", () => {
  beforeEach(() => {
    process.env.DFO_API_KEY = "test-key-123";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DFO_API_KEY;
  });

  it("fetches the job tree from /df/jobs", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(jobsFixture));

    const result = await getJobs();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("/df/jobs");
    expect(result.rows.length).toBe(jobsFixture.rows.length);
  });
});

describe("getSkills", () => {
  beforeEach(() => {
    process.env.DFO_API_KEY = "test-key-123";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DFO_API_KEY;
  });

  it("passes jobGrowId into the query string (it is REQUIRED by the API)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(skillsFixture));

    const jobId = "0b2b0ac15e70d4fc9f4094b9a90937a6";
    const jobGrowId = "33909cf11ad79dec4befa8e8cfef941b";
    const result = await getSkills(jobId, jobGrowId);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchSpy.mock.calls[0]?.[0]);
    expect(calledUrl).toContain(`/df/skills/${jobId}`);
    expect(calledUrl).toContain(`jobGrowId=${jobGrowId}`);
    expect(result.skills.length).toBe(skillsFixture.skills.length);
  });
});
