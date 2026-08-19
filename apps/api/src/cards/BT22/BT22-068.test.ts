import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-068.js";

describe("BT22-068 Agumon (X Antibody)", () => {
  it("returns a Tyrannomon-named or Dinosaur Digimon from trash", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Return",
        to: "hand",
        optional: true,
        target: {
          filter: {
            zone: "trash",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Tyrannomon"], match: "name" },
              { tokens: ["Dinosaur"], match: "trait" },
            ],
          },
          count: 1,
        },
      });
    }
  });

  it("anchors inherited memory gain to this Digimon's battle deletion", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });
});
