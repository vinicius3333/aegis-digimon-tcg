import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-074.js";
describe("BT21-074 Satellamon", () => {
  it("protects a Digimon and shares once-per-turn De-Digivolve", () => {
    expect(
      compiled.effects.filter((e) => e.trigger === "OnPlay" || e.trigger === "WhenDigivolving").length,
    ).toBeGreaterThanOrEqual(3);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({ kind: "DeDigivolve", amount: 1, cost: expect.objectContaining({ kind: "trash" }) }),
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          expect.objectContaining({
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
              count: 1,
            },
          }),
        ],
      }),
    );
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
