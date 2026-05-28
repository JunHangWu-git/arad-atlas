import { describe, expect, it } from "vitest";

import { portraitUrl } from "@/lib/neople/portrait";

describe("portraitUrl", () => {
  it("builds the CDN URL with default zoom", () => {
    expect(portraitUrl("cain", "1a5a0b62c6c189e69a00248aa9f9d0b1")).toBe(
      "https://img-api.dfoneople.com/df/servers/cain/characters/1a5a0b62c6c189e69a00248aa9f9d0b1?zoom=1",
    );
  });

  it("honors an explicit zoom value", () => {
    expect(portraitUrl("siroco", "abc123", 3)).toBe(
      "https://img-api.dfoneople.com/df/servers/siroco/characters/abc123?zoom=3",
    );
  });
});
