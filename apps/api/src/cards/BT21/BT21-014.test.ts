import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-014.js";

describe("BT21-014 compiled implementation", () => {
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

  it("grants Piercing and +3000 DP on play or digivolution, and may evolve into a reduced-cost level 5 Hybrid", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
              duration: "forTheTurn",
            },
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 3000,
              duration: "forTheTurn",
            },
          ],
        }),
      );
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSecurityRemoved",
            actions: [
              {
                kind: "Digivolve",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                from: ["hand"],
                reduceCost: 1,
                optional: true,
                into: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  levels: [5],
                  nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }],
                },
              },
            ],
          },
        ],
      }),
    );
  });
});
