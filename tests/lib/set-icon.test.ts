import { describe, expect, it } from "vitest";

import { setShortLabel } from "@/lib/set-icon";

describe("setShortLabel", () => {
  it("maps a full set name to its short keyword", () => {
    expect(setShortLabel("Paradise of Dazzling Gold Set")).toBe("Gold");
  });

  it("applies special mappings (keyword differs from matched word)", () => {
    expect(setShortLabel("Some Pack of Things")).toBe("Alpha");
    expect(setShortLabel("Death Plane Vestments")).toBe("Shadow");
  });

  it("uses a plain category keyword when present", () => {
    expect(setShortLabel("Ancient Dragon Mail Set")).toBe("Dragon");
  });

  it("falls back to the full name when nothing matches", () => {
    expect(setShortLabel("Totally Unknown Set")).toBe("Totally Unknown Set");
  });

  it("returns null for empty input", () => {
    expect(setShortLabel(null)).toBeNull();
    expect(setShortLabel(undefined)).toBeNull();
    expect(setShortLabel("")).toBeNull();
  });
});
