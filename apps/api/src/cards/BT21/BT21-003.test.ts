import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-003.js";

describe("BT21-003 compiled implementation", () => {
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

  it("draws once per turn when one of your WG Digimon is played", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenPlayed",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["WG"], match: "trait" }],
            },
            actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          },
        ],
      }),
    ]);
  });
});
