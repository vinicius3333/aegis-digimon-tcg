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
  });
});
