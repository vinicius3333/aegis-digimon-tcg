import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-009.js";

describe("EX6-009 Duramon", () => {
  it("pays 2 and places itself under a level 5 or Legend-Arms Digimon to give Security Attack +1", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      target: { fromSelectionRef: "placementTarget", count: 1 },
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "forTheTurn",
      cost: { kind: "payMemory", memory: 2 },
      additionalCosts: [
        {
          kind: "place",
          bindHostAs: "placementTarget",
          position: "bottom",
          target: { from: ["hand"], filter: { isSelfRef: true } },
          underFilter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 5 } },
          underOrFilters: [
            { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Legend-Arms"] }] },
          ],
        },
      ],
    });
  });
  it("inherits a once-per-turn attack-target switch that trashes security and grants Raid/Piercing on stack addition", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
    expect(
      compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Raid" } },
        { kind: "GainKeyword", keyword: { keyword: "Piercing" } },
      ],
    });
  });
});
