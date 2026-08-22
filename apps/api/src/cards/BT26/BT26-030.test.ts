import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-030.js";

describe("BT26-030 Pumpkinmon", () => {
  it("models the TS evolution, Security play, and hand-trash keyword cost", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["TS"], cost: 3, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true })] }),
      expect.objectContaining({ trigger: "OnPlay", actions: [
        expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Execute" }, cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } } }),
        expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Ascension" }, condition: { kind: "ifThisEffectActed" } }),
      ] }),
      expect.objectContaining({ trigger: "WhenDigivolving" }),
    ]));
  });
});
