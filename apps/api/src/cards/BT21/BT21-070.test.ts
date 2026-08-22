import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-070.js";
describe("BT21-070 Gossipmon", () => {
  it("preserves the Appmon link requirement and linked recovery", () => {
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          {
            kind: "Return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
              },
              count: 1,
            },
            to: "hand",
            optional: true,
          },
        ],
      }),
    );
  });

  it("plays from security and recovers Appmon", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        timing: "endOfBattle",
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false })],
      }),
    );
    expect(compiled.effects.filter((e) => e.trigger === "OnPlay" || e.trigger === "WhenDigivolving")).toHaveLength(2);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions).toEqual([
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
      ]);
    }
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });
});
