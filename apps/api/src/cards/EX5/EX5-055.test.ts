import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-055.js";

describe("EX5-055 HeavyLeomon", () => {
  it("has Fortitude and removes an opposing Digimon's top evolution card then bottoms it if 6000 DP or less", () => {
    expect(compiled.effects?.[0]?.keywords?.[0]?.keyword).toBe("Fortitude");
    for (const trigger of ["WhenDigivolving", "OnDeletion"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([
        { kind: "DeDigivolve", amount: 1, target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } } },
        {
          kind: "Return",
          to: "deckBottom",
          target: {
            count: 1,
            filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } },
          },
        },
      ]);
    }
  });
  it("returns an opposing Digimon at 4000 DP or less after an attack, otherwise unsuspends once per turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Return",
          to: "deckBottom",
          bindResultAs: "endOfAttackReturned",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } } },
        },
        {
          kind: "Unsuspend",
          condition: { kind: "bindingEmpty", ref: "endOfAttackReturned" },
          target: { isSelf: true, filter: { isSelfRef: true } },
        },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, names: ["Leomon"], cost: 4, isAlternate: true }]);
  });
});
