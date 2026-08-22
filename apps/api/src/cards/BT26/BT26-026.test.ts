import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-026.js";

describe("BT26-026 Cougarmon", () => {
  it("models the printed evolution, Barrier, and alternate-cost choices", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Glowing Dawn"], cost: 2, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }),
      expect.objectContaining({ trigger: "Static", isInherited: true, keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }),
      expect.objectContaining({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [expect.objectContaining({
        kind: "Modal", choose: 1, options: expect.arrayContaining([
          [expect.objectContaining({ kind: "UseOptionWithoutCost", payCost: true, reduceCostBy: 2, cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" } })],
          [expect.objectContaining({ kind: "UseOptionWithoutCost", payCost: true, reduceCostBy: 2, cost: { kind: "trashSecurityTop", controller: "mine" } })],
        ]),
      })] }),
    ]));
  });
});
