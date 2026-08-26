import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-008.js";

describe("EX6-008 ZubaEagermon", () => {
  it("pays 1 and places itself under a level 4 or Legend-Arms Digimon to give +4000 DP", () => {
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
          underFilter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 4 } },
          underOrFilters: [
            { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Legend-Arms"] }] },
          ],
          destination: "digivolutionStack",
        },
      ],
    });
  });
  it("inherits +2000 DP and grants Raid and Piercing when a digivolution card is added", () => {
    expect(
      compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Raid", raw: "＜Raid＞" } },
        { kind: "GainKeyword", keyword: { keyword: "Piercing", raw: "＜Piercing＞" } },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
    });
  });
});
