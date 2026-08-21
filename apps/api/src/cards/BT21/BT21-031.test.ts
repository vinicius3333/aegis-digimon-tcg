import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-031.js";

describe("BT21-031 compiled implementation", () => {
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

  it("reduces Mollusk or Aquatic digivolution costs and gains memory once per turn at End of Attack", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldDigivolve",
            sourceFilter: { isSelfRef: true },
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Mollusk", "Aquatic"], match: "trait" }],
            },
            actions: [
              {
                kind: "Replacement",
                event: "wouldDigivolve",
                mode: "reduceCost",
                amount: 1,
                raw: "reduce the digivolution cost by 1",
              },
            ],
          },
        ],
      }),
      expect.objectContaining({
        trigger: "EndOfAttack",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{ kind: "GainMemory", amount: 1 }],
      }),
    ]);
  });
});
