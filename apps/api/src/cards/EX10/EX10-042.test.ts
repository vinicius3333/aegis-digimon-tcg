import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-042.js";

describe("EX10-042 GulusGammamon", () => {
  it("proves Gammamon digivolution, trash-to-stack placement, and event-bound Regulusmon digivolution", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Gammamon"], cost: 2, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashTopDeck", controller: "mine", amount: 2 },
          { kind: "PlaceUnder", target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"] }, count: 1, from: ["trash"] }, optional: true },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "onAddDigivolutionCards",
        sourceFilter: { isSelfRef: true },
        actions: [{ kind: "Digivolve", into: { nameOrTrait: [{ tokens: ["Regulusmon"], match: "name" }] }, from: ["hand", "trash"], reduceCost: 1, optional: true }],
      }],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ keywords: [{ keyword: "Raid" }] });
  });
});
