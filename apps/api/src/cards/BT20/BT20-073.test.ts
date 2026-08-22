import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-073.js";

describe("BT20-073 MetalPhantomon", () => {
  it("has Blocker", () => {
    expect(compiled.effects.find((effect) => !effect.isInherited)).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
  });

  it("costs one own Digimon to delete one opposing level 5 or lower Digimon on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{ kind: "Delete", optional: true, abortOnDecline: true, cost: { kind: "deleteOwn", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } }, target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } }, count: 1 } }] });
    }
  });

  it("inherits De-Digivolve 1 against one opposing Digimon on deletion", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }] });
  });
});
