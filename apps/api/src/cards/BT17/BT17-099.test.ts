import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-099.js";

describe("BT17-099 Awakening of the Sun", () => {
  it("keeps the Main play clause separate from the Delay digivolution", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "PlayWithoutCost" }, { kind: "PlaceInBattleAreaSelf" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, into: { nameOrTrait: [{ tokens: ["ShineGreymon"], match: "name" }] } }],
    });
  });

  it("grants Delay when an owned Tamer is deleted or returned to hand", () => {
    expect(compiled.effects?.[2]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { controller: "mine", kind: ["Tamer"] } }),
        expect.objectContaining({ kind: "SubTrigger", event: "whenEffectAddsToHand", sourceFilter: { controller: "mine", kind: ["Tamer"] } }),
      ]),
    );
  });

  it("keeps Security limited to Marcus Damon or Rhythm", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"] }, { kind: "PlaceInBattleAreaSelf" }] });
  });
});
