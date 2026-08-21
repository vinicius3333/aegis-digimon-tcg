import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-096.js";

describe("BT17-096 Crimson Savior", () => {
  it("keeps the Main play clause and exposes Gallantmon digivolution as Delay", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "PlayWithoutCost" }, { kind: "PlaceInBattleAreaSelf" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, into: { nameOrTrait: [{ tokens: ["Gallantmon"], match: "name" }] } }],
    });
  });

  it("grants Delay only when an opponent plays a level 5 or higher Digimon", () => {
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" }, duration: "permanent" }],
    });
  });

  it("activates the Main effect from Security", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] });
  });
});
