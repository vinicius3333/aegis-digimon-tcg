import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-077.js";

describe("BT20-077 HeavyMetaldramon", () => {
  it("trashes to four hand cards, then plays a trash Digimon under the scaled DP ceiling", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "Trash", trackCount: "trashedThisEffect", target: { count: "untilHandHas", untilHandSize: 4 } });
      expect(actions[1]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], payCost: false, dpCeilingModifier: { mode: "lowerCeiling", amount: 2000, scalingSource: "trashedThisEffect" } });
    }
  });

  it("grants qualifying Dark Dragon or Evil Dragon Digimon Rush, Blocker, and +2000 DP", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({ actions: [{ kind: "ModifyDP", amount: 2000, target: { count: "all" } }, { kind: "GainKeyword", keyword: { keyword: "Rush" } }, { kind: "GainKeyword", keyword: { keyword: "Blocker" } }] });
  });
});
