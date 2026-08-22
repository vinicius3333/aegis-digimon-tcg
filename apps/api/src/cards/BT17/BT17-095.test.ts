import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-095.js";

describe("BT17-095 Miraculous Mega Knight", () => {
  it("keeps the Main play clause separate from the Omnimon Delay DNA effect", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "PlayWithoutCost" }, { kind: "PlaceInBattleAreaSelf" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [{
        kind: "DnaDigivolve",
        payCost: false,
        materials: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
        looseMaterials: { count: 1, from: ["hand"], filter: { zone: "hand", controller: "mine", kind: ["Digimon"] } },
        into: { nameOrTrait: [{ tokens: ["Omnimon"], match: "name" }] },
      }],
    });
  });

  it("grants Delay only for an owned level 6 Greymon or Garurumon leaving outside battle", () => {
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanBattle",
      sourceFilter: { controller: "mine", kind: ["Digimon"], levels: [6], nameOrTrait: [{ tokens: ["Greymon", "Garurumon"], match: "name" }] },
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" } }],
    });
  });

  it("adds itself to hand after the Security Tamer play option", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost" }, { kind: "AddToHandSelf" }] });
  });
});
