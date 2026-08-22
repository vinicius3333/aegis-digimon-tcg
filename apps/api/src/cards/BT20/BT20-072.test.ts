import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-072.js";

describe("BT20-072 Phantomon", () => {
  it("has Execute", () => {
    expect(compiled.effects.find((effect) => !effect.isInherited)).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Execute" }] });
  });

  it("may play one own level 4 or lower Ghost Digimon from trash without paying on deletion", () => {
    for (const effect of compiled.effects.filter((entry) => entry.trigger === "OnDeletion")) {
      expect(effect).toMatchObject({ actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 }, nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] }, count: 1 } }] });
    }
    expect(compiled.effects.filter((effect) => effect.trigger === "OnDeletion")).toHaveLength(2);
  });
});
