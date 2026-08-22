import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-075.js";

describe("BT26-075 compiled behavior", () => {
  it("proves both security/deletion costed plays and the Option lowest-level effect", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Glowing Dawn"], cost: 3, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false, from: ["trash"], optional: true, cost: expect.objectContaining({ kind: "trash" }) })] }),
      expect.objectContaining({ trigger: "OnDeletion", actions: [expect.objectContaining({ kind: "PlayWithoutCost", target: expect.objectContaining({ filter: expect.objectContaining({ playCostLte: 5, nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] }) }) })] }),
      expect.objectContaining({ trigger: "Main", actions: [{ kind: "Delete", target: expect.objectContaining({ count: 1, filter: expect.objectContaining({ controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }) }) }] }),
    ]));
  });

  it("requires a face-down bottom card under a Tamer and preserves the printed waiver", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security")!;
    const cost = security.actions[0].cost;
    expect(cost.target.filter).toMatchObject({ zone: "digivolutionCards", position: "bottom", faceDown: true, hostFilter: { kind: ["Tamer"] } });
    expect(compiled.effects[0].actions[0]).toMatchObject({ kind: "WaiveColorRequirement", condition: { kind: "youHave" } });
    expect(compiled.effects[0].actions.slice(1)).toEqual([
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Execute" } }),
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Ascension" } }),
    ]);
  });
});
