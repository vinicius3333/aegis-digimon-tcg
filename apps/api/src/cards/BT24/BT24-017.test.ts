import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-017.js";

describe("BT24-017 Medusamon", () => {
  it("deletes the lowest-DP Digimon, pays the exact two-card trash cost, and scales DP", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, colors: ["Red"], cost: 3 }]);
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")!;
    expect(effect.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "Delete", target: { filter: { superlative: "lowestDP" } } }),
        expect.objectContaining({
          kind: "PlayToken",
          tokens: ["Petrification Token"],
          count: 2,
          placedAs: "opponentDigimon",
          cost: { kind: "return", target: { count: 2 } },
        }),
        expect.objectContaining({
          kind: "ModifyDP",
          amount: 2000,
          condition: { kind: "ifThisEffectActed" },
          scaling: { per: 1, unit: "cards" },
        }),
      ]),
    );
  });
});
