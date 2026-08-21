import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-008.js";

describe("EX6-008 ZubaEagermon", () => {
  it("pays 1 and places itself under a level 4 or Legend-Arms Digimon to give +4000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 4000,
      duration: "forTheTurn",
      target: {
        count: 1,
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          orFilters: [
            { levelComparison: { op: "eq", value: 4 } },
            { nameOrTrait: [{ match: "trait", tokens: ["Legend-Arms"] }] },
          ],
        },
      },
      cost: { kind: "payAndPlaceUnder", payCost: 1, placeThis: true, position: "bottom" },
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
