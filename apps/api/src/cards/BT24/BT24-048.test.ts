import { describe, expect, it } from "vitest";
import { compiled as BT24_048 } from "./BT24-048.js";

describe("BT24-048 Deramon", () => {
  it("hatches and may free-digivolve a breeding-area Avian/Bird Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_048.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "Hatch", optional: true });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Digivolve",
        payCost: false,
        from: ["hand"],
        optional: true,
        target: { filter: { zone: "breedingArea" } },
        into: {
          levelComparison: { op: "lte", value: 5 },
          nameOrTrait: [{ tokens: ["Avian", "Bird"], match: "trait" }],
        },
      });
    }
  });
  it("has the inherited once-per-turn battle deletion unsuspend", () => {
    expect(BT24_048.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
    });
  });
});
