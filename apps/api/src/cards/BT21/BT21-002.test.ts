import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-002.js";

describe("BT21-002 compiled implementation", () => {
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

  it("draws once per turn only for a Gammamon-text or Hero Digimon", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 1,
            condition: {
              kind: "anyOf",
              conditions: [
                { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }] } },
                { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Hero"], match: "trait" }] } },
              ],
              raw: "this Digimon has [Gammamon] in its text or the [Hero] trait",
            },
          },
        ],
      }),
    ]);
  });
});
