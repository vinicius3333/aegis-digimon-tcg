import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-037.js";

describe("BT23-037 Tentomon", () => {
  it("reduces this Digimon's CS digivolution cost by 1 during your turn", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    const replacement = effect.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
      into: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
      },
      actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
    });
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
