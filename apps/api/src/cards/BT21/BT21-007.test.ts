import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-007.js";

describe("BT21-007 compiled implementation", () => {
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

  it("optionally returns one Reptile or Dragonkin Digimon from trash and grants +2000 DP on your turn", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [
          {
            kind: "Return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }],
              },
              count: 1,
            },
            to: "hand",
            optional: true,
          },
        ],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "ModifyDP",
            amount: 2000,
            duration: "permanent",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        ],
      }),
    ]);
  });
});
