import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-056.js";

describe("BT24-056 Dezipmon", () => {
  it("protects System/Life/Transmutation Digimon, revives Appmon, and deletes on linking", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Hackmon", "Protecmon", "Pipomon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker" }] }),
      expect.objectContaining({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "Restrict", restriction: "beReturned", byOpponentEffectsOnly: true }), expect.objectContaining({ kind: "PlayWithoutCost", from: ["trash"], payCost: false })] }),
      expect.objectContaining({ trigger: "WhenDigivolving" }),
      expect.objectContaining({ trigger: "WhenLinking", isLinked: true, actions: [expect.objectContaining({ kind: "Delete", target: { filter: { playCostLte: 5 } } })] }),
    ]));
  });
});
