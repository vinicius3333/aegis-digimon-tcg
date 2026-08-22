import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-066.js";

describe("BT24-066 Guilmon", () => {
  it("reveals qualifying trait cards or purple Tamers, trashes a second hit, and trashes one hand card", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Gigimon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "RevealAdd", revealCount: 3, add: [{ to: "hand" }, { to: "trash", requiresMinRevealed: 2 }], rest: "deckBottom" },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", levels: [3] }, count: 1 } }],
    });
  });
});
