import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-036.js";

describe("EX10-036 Magneticdramon", () => {
  it("proves Fragment, deletion plus security trash, shared unsuspend, and alternate digivolution", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Close", "Proganomon"], cost: 6, isAlternate: true },
    ]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Fragment", amount: 3 }],
    });

    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effects = compiled.effects?.filter((effect) => effect.trigger === trigger);
      expect(effects).toHaveLength(2);
      expect(effects?.[0]).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            cost: { kind: "trash", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 3 } },
          },
          { kind: "trashSecurityTop", controller: "opponent", count: 1 },
        ],
      });
      expect(effects?.[1]).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [{ kind: "Unsuspend", cost: { kind: "place", target: { count: 3, from: ["trash"] } } }],
      });
    }
  });
});
