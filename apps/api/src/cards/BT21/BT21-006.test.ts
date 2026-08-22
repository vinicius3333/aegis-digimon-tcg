import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-006.js";

describe("BT21-006 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("grants +3000 DP only with at least four Vemmon digivolution cards", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "AllTurns",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "ModifyDP",
            amount: 3000,
            duration: "permanent",
            condition: {
              kind: "selfDigivolutionStackCountAtLeast",
              count: 4,
              filter: { nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }] },
            },
          }),
        ],
      }),
    ]);
  });
});
