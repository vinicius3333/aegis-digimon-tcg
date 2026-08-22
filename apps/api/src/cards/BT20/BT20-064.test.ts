import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-064.js";

describe("BT20-064 Loogamon", () => {
  it("reveals three and adds one SoC/SEEKERS card and one Eiji Nagasumi, bottoming the rest", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ filter: { nameOrTrait: [{ tokens: ["SoC", "SEEKERS"], match: "trait" }] }, count: 1, to: "hand" }, { filter: { nameOrTrait: [{ tokens: ["Eiji Nagasumi"], match: "name" }] }, count: 1, to: "hand" }] }] });
  });

  it("grants inherited +2000 DP during its controller's turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { filter: { isSelfRef: true }, isSelf: true } }] });
  });
});
