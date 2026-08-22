import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-011.js";

describe("BT21-011 compiled implementation", () => {
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

  it("reduces Xros Heart/Hero digivolution costs and grants Rush only while this Digimon has Xros Heart", () => {
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
              nameOrTrait: [{ tokens: ["Xros Heart", "Hero"], match: "trait" }],
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
        trigger: "OnDeletion",
        actions: [],
        keywords: [{ keyword: "Save", raw: "＜Save＞" }],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "GainKeyword",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            keyword: { keyword: "Rush", raw: "＜Rush＞" },
            duration: "permanent",
            condition: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] } },
          },
        ],
      }),
    ]);
  });
});
