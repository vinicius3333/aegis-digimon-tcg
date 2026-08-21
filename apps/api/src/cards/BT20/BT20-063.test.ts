import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-063.js";

describe("BT20-063 Ghostmon", () => {
  it("reveals three and adds one Ghost and one LIBERATOR card, bottoming the rest", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ filter: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] }, count: 1, to: "hand" }, { filter: { nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] }, count: 1, to: "hand" }] }] });
  });

  it("inherits On Deletion gain 1 memory", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "GainMemory", amount: 1 }] });
  });
});
