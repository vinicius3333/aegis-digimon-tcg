import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-038.js";

describe("EX10-038 Copipemon", () => {
  it("proves the Appmon alternate digivolution and two-category reveal", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Appmon"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          { filter: { nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] }, count: 1, to: "hand" },
          { filter: { nameOrTrait: [{ tokens: ["Leviathan"], match: "trait" }] }, count: 1, to: "hand" },
        ],
        rest: "deckBottom",
      }],
    });
  });
});
