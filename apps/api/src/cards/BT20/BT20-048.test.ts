import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-048.js";

describe("BT20-048 Dorumon", () => {
  it("reveals three, adds one X Antibody card and one Chronicle Tamer or Option, and bottoms the rest", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] }, count: 1, to: "hand" }, { filter: { kind: ["Tamer", "Option"], nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }] }, count: 1, to: "hand" }] }] });
  });

  it("grants the inherited +2000 DP during the opponent's turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "OpponentsTurn", actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { filter: { isSelfRef: true }, isSelf: true } }] });
  });
});
