import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-067.js";

describe("BT20-067 Soulmon", () => {
  it("grants one own Digimon Retaliation on play and digivolving through the opponent's turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{ kind: "GainKeyword", keyword: { keyword: "Retaliation" }, duration: "untilOpponentTurnEnd", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } }] });
    }
  });

  it("inherits the costed hand-trash deletion effect", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "Delete", optional: true, abortOnDecline: true, cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } }, target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 } }] });
  });
});
