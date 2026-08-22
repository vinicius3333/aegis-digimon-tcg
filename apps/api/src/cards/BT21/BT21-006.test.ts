import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-006.js";
import "./BT21-056.js";

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

  it("applies the inherited DP bonus only at the four-card boundary", async () => {
    const below = setupEngine({
      0: {
        battleArea: [{ card: "BT21-006", as: "below", under: ["BT21-056", "BT21-056", "BT21-056"] }],
      },
    });
    const atBoundary = setupEngine({
      0: {
        battleArea: [{ card: "BT21-006", as: "atBoundary", under: ["BT21-056", "BT21-056", "BT21-056", "BT21-056"] }],
      },
    });

    await below.ready();
    await atBoundary.ready();
    expect(below.perm("below").currentDP).toBe(0);
    expect(atBoundary.perm("atBoundary").currentDP).toBe(0);
  });
});
