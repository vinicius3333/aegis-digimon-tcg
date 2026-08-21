import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-019.js";

describe("BT21-019 compiled implementation", () => {
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

  it("plays Hiro Amanokawa on digivolution when you have at most one Tamer and grants inherited DP", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Hiro Amanokawa"], match: "name" }] },
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
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            amount: 2000,
            duration: "permanent",
          },
        ],
      }),
    ]);
  });
});
