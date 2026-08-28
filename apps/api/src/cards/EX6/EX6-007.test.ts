import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-007.js";

describe("EX6-007 Zubamon", () => {
  it("pays 1 and places itself under a level 3 or Legend-Arms Digimon to give it +4000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 4000,
      duration: "forTheTurn",
      target: { fromSelectionRef: "placementTarget", count: 1 },
      cost: { kind: "payMemory", memory: 1 },
      additionalCosts: [
        {
          kind: "place",
          bindHostAs: "placementTarget",
          position: "bottom",
          target: { from: ["hand"], filter: { isSelfRef: true } },
          underFilter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 3 } },
          underOrFilters: [
            { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Legend-Arms"] }] },
          ],
          destination: "digivolutionStack",
        },
      ],
    });
  });
  it("draws once per turn when a digivolution card is added and inherits +2000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
  });
});
