import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-098.js";

describe("BT15-098", () => {
  it("requires an own-Digimon deletion before optionally playing Myotismon and placing itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "CostGatedBlock", cost: { kind: "deleteOwn" }, actions: [{ kind: "PlayWithoutCost", from: ["trash"] }, { kind: "PlaceInBattleAreaSelf" }] }],
    });
  });
  it("places itself when Myotismon is deleted, has Delay, and plays VenomMyotismon from trash", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "PlaceInBattleAreaSelf" }] }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Main", keywords: [{ keyword: "Delay" }], actions: [{ kind: "PlayWithoutCost", requiresDelayArmed: true }] });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlaceInBattleAreaSelf" }] });
  });
});
