import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-015.js";

describe("BT17-015", () => {
  it("reduces its play cost by 3 when you have a Tai Kamiya Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed", actions: [{ kind: "Replacement", mode: "reduceCost", amount: 3, condition: { kind: "youHave" } }] }] });
  });

  it("offers deletion or free MetalGarurumon digivolution on play and digivolution", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Modal", choose: 1, options: [[{ kind: "Delete" }], [{ kind: "Digivolve", from: ["hand"], payCost: false, ignoreRequirements: true, optional: true }]] });
    }
  });

  it("trashes opponent security as inherited when it has Omnimon in its name", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1, condition: { kind: "selfHasNameContaining" } }] });
  });
});
