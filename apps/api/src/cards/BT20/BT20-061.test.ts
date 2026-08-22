import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-061.js";

describe("BT20-061 Impmon", () => {
  it("reveals three and adds one qualifying trait card and one Yuuki, bottoming the rest", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ filter: { nameOrTrait: [{ tokens: ["Evil", "Dark Dragon", "Evil Dragon"], match: "trait" }] }, count: 1, to: "hand" }, { filter: { nameOrTrait: [{ tokens: ["Yuuki"], match: "name" }] }, count: 1, to: "hand" }] }] });
  });

  it("grants inherited +2000 DP during its controller's turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { filter: { isSelfRef: true }, isSelf: true } }] });
  });
});
