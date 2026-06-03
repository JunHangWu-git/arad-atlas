import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// deriveMetrics is pure, but importing lib/progression drags in the DB layer
// (via @/lib/roster + @/lib/snapshot). Stub it — the function under test never
// touches the db.
vi.mock("@/db", () => ({ db: {} }));

import { deriveMetrics } from "@/lib/progression";

/** Build a Neople-shaped equipment blob from per-slot specs. */
function equipBlob(
  pieces: Array<{ slotName: string; reinforce?: number; enchanted?: boolean }>,
  setPoint: number | null,
) {
  return {
    equipment: pieces.map((p) => ({
      slotName: p.slotName,
      reinforce: p.reinforce ?? 0,
      enchant: p.enchanted
        ? { status: [{ name: "Strength", value: 15 }] }
        : undefined,
    })),
    setItemInfo:
      setPoint == null
        ? []
        : [
            {
              setItemName: "Test Set",
              setItemRarityName: "Epic",
              active: { setPoint: { current: setPoint } },
            },
          ],
  };
}

/** Build a Neople-shaped buff-equipment blob with a given buff-skill level. */
function buffBlob(level: number | null) {
  if (level == null) return null;
  return {
    skill: {
      buff: {
        skillInfo: { name: "Test Buff", option: { level } },
        equipment: [],
      },
    },
  };
}

const ARMOR = ["Top", "Bottom", "Shoulder", "Belt", "Shoes"];

describe("deriveMetrics", () => {
  it("marks a fully-built character as graduated (all green)", () => {
    const equip = equipBlob(
      ARMOR.map((slotName) => ({ slotName, reinforce: 11, enchanted: true })),
      2570,
    );
    const m = deriveMetrics({ equipment: equip, buffEquipment: buffBlob(30) });

    expect(m.setName).toBe("Test Set");
    expect(m.setPoint).toEqual({ label: "2,570", status: "done" });
    expect(m.amplify).toEqual({ label: "+11", status: "done" });
    expect(m.enchant).toEqual({ label: "100%", status: "done" });
    expect(m.buff).toEqual({ label: "Lv30", status: "done" });
  });

  it("marks a mid-progress character as in-progress (yellow)", () => {
    // amp 8 (partial), half the pieces enchanted (50% partial), set 2400, buff 25
    const equip = equipBlob(
      ARMOR.map((slotName, i) => ({
        slotName,
        reinforce: 8,
        enchanted: i < 3, // 3 of 5 → 60%
      })),
      2400,
    );
    const m = deriveMetrics({ equipment: equip, buffEquipment: buffBlob(25) });

    expect(m.setPoint.status).toBe("partial");
    expect(m.amplify).toEqual({ label: "+8", status: "partial" });
    expect(m.enchant.status).toBe("partial");
    expect(m.buff).toEqual({ label: "Lv25", status: "partial" });
  });

  it("takes amplify from the weakest armor piece (min, not max)", () => {
    const equip = equipBlob(
      [
        { slotName: "Top", reinforce: 12 },
        { slotName: "Bottom", reinforce: 7 }, // weakest → drives the reading
        { slotName: "Shoes", reinforce: 11 },
      ],
      null,
    );
    expect(deriveMetrics({ equipment: equip }).amplify).toEqual({
      label: "+7",
      status: "todo",
    });
  });

  it("ignores non-armor slots for the amplify reading", () => {
    const equip = equipBlob(
      [
        { slotName: "Top", reinforce: 11 },
        { slotName: "Bottom", reinforce: 11 },
        { slotName: "Belt", reinforce: 11 },
        { slotName: "Shoulder", reinforce: 11 },
        { slotName: "Shoes", reinforce: 11 },
        { slotName: "Weapon", reinforce: 0 }, // not armor — must not pull min to 0
      ],
      null,
    );
    expect(deriveMetrics({ equipment: equip }).amplify.status).toBe("done");
  });

  it("marks an under-built character as to-do (red)", () => {
    const equip = equipBlob(
      ARMOR.map((slotName) => ({ slotName, reinforce: 3, enchanted: false })),
      1000,
    );
    const m = deriveMetrics({ equipment: equip, buffEquipment: buffBlob(10) });

    expect(m.setPoint.status).toBe("todo");
    expect(m.amplify).toEqual({ label: "+3", status: "todo" });
    expect(m.enchant).toEqual({ label: "0%", status: "todo" });
    expect(m.buff).toEqual({ label: "Lv10", status: "todo" });
  });

  it("returns placeholder metrics when blobs are empty/missing", () => {
    const m = deriveMetrics({});
    expect(m.setName).toBeNull();
    expect(m.setPoint).toEqual({ label: "—", status: "todo" });
    expect(m.amplify).toEqual({ label: "—", status: "todo" });
    expect(m.enchant).toEqual({ label: "—", status: "todo" });
    expect(m.buff).toEqual({ label: "—", status: "todo" });
  });
});
