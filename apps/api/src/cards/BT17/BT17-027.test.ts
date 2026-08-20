import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-027.js";

describe("BT17-027", () => {
  it("reduces its play cost by 3 with a Matt Ishida Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed", actions: [{ kind: "Replacement", mode: "reduceCost", amount: 3, condition: { kind: "youHave" } }] }] });
  });

  it("offers suspension or free WarGreymon digivolution on play and digivolution", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Modal", choose: 1, options: [[{ kind: "Restrict", restriction: "suspend" }], [{ kind: "Digivolve", from: ["hand"], payCost: false, ignoreRequirements: true, optional: true }]] });
    }
  });

  it("unsuspends once per turn as inherited when it has Omnimon in its name", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Unsuspend", condition: { kind: "selfHasNameContaining" } }] });
  });
});
