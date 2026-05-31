import { describe, expect, it } from "vitest";

import {
  parseEquipmentSet,
  parseBuffEquipment,
  parseAvatarsDetailed,
  splitEquipmentForGrid,
  type EquipmentRow,
} from "@/lib/gear";

function row(partial: Partial<EquipmentRow> & { slotName: string }): EquipmentRow {
  return {
    slotId: partial.slotName.toUpperCase(),
    itemId: "1",
    itemName: "Item",
    itemRarity: "Epic",
    itemTypeDetail: null,
    reinforce: 0,
    amplificationName: null,
    fusionName: null,
    fusionRarity: null,
    fusionItemId: null,
    fusionEffect: null,
    enchant: [],
    ...partial,
  };
}

describe("parseEquipmentSet", () => {
  it("extracts set name, rarity, and current set-point from a real-shaped blob", () => {
    const blob = {
      equipment: [],
      setItemInfo: [
        {
          setItemId: "abc",
          setItemName: "Paradise of Dazzling Gold Set",
          setItemRarityName: "Epic III",
          active: {
            explain: "…",
            setPoint: { current: 2320, min: 2270, max: 2355 },
          },
        },
      ],
    };

    expect(parseEquipmentSet(blob)).toEqual({
      name: "Paradise of Dazzling Gold Set",
      rarityName: "Epic III",
      setPoint: 2320,
    });
  });

  it("returns the first set when several are present", () => {
    const blob = {
      setItemInfo: [
        { setItemName: "Primary Set", active: { setPoint: { current: 100 } } },
        { setItemName: "Secondary Set", active: { setPoint: { current: 50 } } },
      ],
    };
    expect(parseEquipmentSet(blob)?.name).toBe("Primary Set");
  });

  it("tolerates a missing set-point (name only)", () => {
    const blob = {
      setItemInfo: [{ setItemName: "Bare Set", setItemRarityName: "Legendary" }],
    };
    expect(parseEquipmentSet(blob)).toEqual({
      name: "Bare Set",
      rarityName: "Legendary",
      setPoint: null,
    });
  });

  it("returns null when no set is equipped or the blob is malformed", () => {
    expect(parseEquipmentSet({ equipment: [] })).toBeNull();
    expect(parseEquipmentSet({ setItemInfo: [] })).toBeNull();
    expect(parseEquipmentSet({ setItemInfo: [{}] })).toBeNull();
    expect(parseEquipmentSet(null)).toBeNull();
    expect(parseEquipmentSet("garbage")).toBeNull();
  });
});

describe("parseBuffEquipment", () => {
  it("extracts skill name, level, and buff equipment from a real-shaped blob", () => {
    const blob = {
      skill: {
        buff: {
          skillInfo: {
            name: "Demonic Unleash",
            option: { level: 20, desc: "Dark Abyss" },
          },
          equipment: [
            { itemId: "a1", itemName: "Dark Abyss Coat", itemRarity: "Epic", slotName: "Top" },
            { itemId: "a2", itemName: "Adventurer's Will", itemRarity: "Legendary", slotName: "Title" },
          ],
        },
      },
    };

    expect(parseBuffEquipment(blob)).toEqual({
      skillName: "Demonic Unleash",
      level: 20,
      equipment: [
        { itemId: "a1", itemName: "Dark Abyss Coat", itemRarity: "Epic", slotName: "Top" },
        { itemId: "a2", itemName: "Adventurer's Will", itemRarity: "Legendary", slotName: "Title" },
      ],
    });
  });

  it("degrades to empty fields on a malformed or empty blob", () => {
    expect(parseBuffEquipment(null)).toEqual({
      skillName: null,
      level: null,
      equipment: [],
    });
    expect(parseBuffEquipment({ skill: {} })).toEqual({
      skillName: null,
      level: null,
      equipment: [],
    });
  });
});

describe("parseAvatarsDetailed", () => {
  it("extracts slot, option, clone, and emblems; tidies doubled whitespace", () => {
    const blob = {
      avatar: [
        {
          slotName: "Weapon Avatar",
          itemId: "w1",
          itemName: "Rare Clone Weapon Avatar [60Lv]",
          itemRarity: "Rare",
          optionAbility: "Strength 55  Increased",
          clone: { itemId: "c1", itemName: "Aeterna Hunter Weapon Avatar" },
          emblems: [
            { slotNo: 1, slotColor: "Red", itemId: "e1", itemName: "Gold Red Emblem+ [STR]", itemRarity: "Unique" },
          ],
        },
      ],
    };

    expect(parseAvatarsDetailed(blob)).toEqual([
      {
        slotName: "Weapon Avatar",
        itemId: "w1",
        itemName: "Rare Clone Weapon Avatar [60Lv]",
        itemRarity: "Rare",
        optionAbility: "Strength 55 Increased",
        clone: { itemId: "c1", itemName: "Aeterna Hunter Weapon Avatar" },
        emblems: [
          { itemId: "e1", itemName: "Gold Red Emblem+ [STR]", itemRarity: "Unique", color: "Red" },
        ],
      },
    ]);
  });

  it("nulls the clone when it has no name (e.g. skin/aura avatars)", () => {
    const blob = {
      avatar: [
        {
          slotName: "Aura Avatar",
          itemId: "a1",
          itemName: "World Beneath the Waves",
          itemRarity: "Rare",
          optionAbility: null,
          clone: { itemId: null, itemName: null },
          emblems: [],
        },
      ],
    };
    const [slot] = parseAvatarsDetailed(blob);
    expect(slot.clone).toBeNull();
    expect(slot.optionAbility).toBeNull();
    expect(slot.emblems).toEqual([]);
  });

  it("returns an empty array on a malformed blob", () => {
    expect(parseAvatarsDetailed(null)).toEqual([]);
    expect(parseAvatarsDetailed({})).toEqual([]);
  });
});

describe("splitEquipmentForGrid", () => {
  it("routes armor slots left and everything else right", () => {
    const rows = [
      row({ slotName: "Weapon" }),
      row({ slotName: "Shoulder" }),
      row({ slotName: "Top" }),
      row({ slotName: "Ring" }),
      row({ slotName: "Shoes" }),
    ];
    const { left, right } = splitEquipmentForGrid(rows);
    expect(left.map((r) => r.slotName)).toEqual(["Shoulder", "Top", "Shoes"]);
    expect(right.map((r) => r.slotName)).toEqual(["Weapon", "Ring"]);
  });

  it("sends unknown slots to the right column", () => {
    const { left, right } = splitEquipmentForGrid([row({ slotName: "Mystery" })]);
    expect(left).toHaveLength(0);
    expect(right).toHaveLength(1);
  });
});
