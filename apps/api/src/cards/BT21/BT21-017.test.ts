import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-017.js";

describe("BT21-017 compiled implementation", () => {
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

  it("plays Owen Dreadnought when digivolving with at most one Tamer and gains memory once per turn on security removal", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Owen Dreadnought"], match: "name" }] },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            condition: {
              kind: "youHave",
              filter: { controllerDefault: "mine", kind: ["Tamer"] },
              raw: "you have 1 or fewer Tamers",
            },
            optional: true,
          },
        ],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "GainMemory", amount: 1 }] }],
      }),
    ]);
  });
});
