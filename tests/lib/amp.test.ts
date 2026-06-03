import { describe, expect, it } from "vitest";

import {
  parseAtkAmpPct,
  parseAtkAmpFromText,
  itemAtkAmpPct,
  ampMetric,
} from "@/lib/amp";

describe("parseAtkAmpPct", () => {
  it("reads a percent string from itemStatus", () => {
    const status = [
      { name: "Strength", value: 100 },
      { name: "Atk. Amp.", value: "20%" },
      { name: "Buff Power Amp.", value: "2%" },
    ];
    expect(parseAtkAmpPct(status)).toBe(20);
  });

  it("reads a numeric value", () => {
    expect(parseAtkAmpPct([{ name: "Atk. Amp.", value: 18 }])).toBe(18);
  });

  it("matches the stat name case-insensitively", () => {
    expect(parseAtkAmpPct([{ name: "atk. amp.", value: "25%" }])).toBe(25);
  });

  it("returns null when there is no Atk. Amp. stat", () => {
    expect(parseAtkAmpPct([{ name: "Attack Spd.", value: "5%" }])).toBeNull();
    expect(parseAtkAmpPct([])).toBeNull();
    expect(parseAtkAmpPct(null)).toBeNull();
    expect(parseAtkAmpPct(undefined)).toBeNull();
  });
});

describe("parseAtkAmpFromText", () => {
  it("extracts the percent from a description string", () => {
    expect(parseAtkAmpFromText("Atk. Amp. +12%")).toBe(12);
    expect(parseAtkAmpFromText("Increases Atk. Amp by 10%")).toBe(10);
  });

  it("scans multiple fields in order, returns first hit", () => {
    expect(parseAtkAmpFromText(null, "no amp here", "Atk. Amp +25%")).toBe(25);
  });

  it("returns null when no Atk. Amp phrase is present", () => {
    expect(parseAtkAmpFromText("Attack Speed +5%")).toBeNull();
    expect(parseAtkAmpFromText(null, undefined, "")).toBeNull();
  });
});

describe("itemAtkAmpPct — status first, description fallback", () => {
  it("prefers itemStatus (title / creature)", () => {
    expect(
      itemAtkAmpPct({
        itemStatus: [{ name: "Atk. Amp.", value: "20%" }],
        itemExplainDetail: "Atk. Amp. +99%",
      }),
    ).toBe(20);
  });

  it("falls back to the description when itemStatus has no amp (aura)", () => {
    expect(
      itemAtkAmpPct({
        itemStatus: [{ name: "Attack Spd.", value: "10%" }],
        itemExplainDetail: "Atk. Amp. +12%",
      }),
    ).toBe(12);
  });

  it("returns null when neither source carries an amp", () => {
    expect(itemAtkAmpPct({ itemStatus: [], itemExplain: "cosmetic" })).toBeNull();
    expect(itemAtkAmpPct({})).toBeNull();
  });
});

describe("ampMetric — title thresholds (green 20, yellow 18)", () => {
  it("green at >= 20%", () => {
    expect(ampMetric("title", 20)).toEqual({
      label: "Atk. Amp. +20%",
      status: "done",
      tooltip: undefined,
    });
    expect(ampMetric("title", 22).status).toBe("done");
  });
  it("yellow at 18–19%", () => {
    expect(ampMetric("title", 18).status).toBe("partial");
    expect(ampMetric("title", 19).status).toBe("partial");
  });
  it("red below 18%", () => {
    expect(ampMetric("title", 17).status).toBe("todo");
    expect(ampMetric("title", null).status).toBe("todo"); // no amp → 0% → red
  });
});

describe("ampMetric — aura thresholds (green 12, yellow 10)", () => {
  it("green / yellow / red bands", () => {
    expect(ampMetric("aura", 12).status).toBe("done");
    expect(ampMetric("aura", 10).status).toBe("partial");
    expect(ampMetric("aura", 9).status).toBe("todo");
  });
});

describe("ampMetric — creature thresholds (teal 40, green 25, yellow 20)", () => {
  it("teal at >= 40%", () => {
    expect(ampMetric("creature", 40).status).toBe("teal");
    expect(ampMetric("creature", 50).status).toBe("teal");
  });
  it("green at 25–39%", () => {
    expect(ampMetric("creature", 25).status).toBe("done");
    expect(ampMetric("creature", 39).status).toBe("done");
  });
  it("yellow at 20–24%", () => {
    expect(ampMetric("creature", 20).status).toBe("partial");
    expect(ampMetric("creature", 24).status).toBe("partial");
  });
  it("red below 20%", () => {
    expect(ampMetric("creature", 19).status).toBe("todo");
  });
});

describe("ampMetric — label + tooltip", () => {
  it("labels the percent and surfaces the item name as a tooltip", () => {
    expect(ampMetric("title", 20, "Rending Toxin")).toEqual({
      label: "Atk. Amp. +20%",
      status: "done",
      tooltip: "Rending Toxin",
    });
  });
});
