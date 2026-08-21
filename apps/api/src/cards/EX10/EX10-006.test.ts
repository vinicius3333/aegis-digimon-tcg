import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-006.js";

describe("EX10-006 Agumon", () => {
  it("models the zero-cost Koromon evolution and the optional Virus Greymon return", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Koromon"], cost: 0, isAlternate: true }]);

    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{
        kind: "Return",
        optional: true,
        to: "hand",
        target: {
          filter: {
            zone: "trash",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Virus"], match: "trait" },
              { tokens: ["Greymon"], match: "name" },
            ],
          },
          count: 1,
        },
      }],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { filter: { isSelfRef: true }, isSelf: true } }],
    });
  });
});
