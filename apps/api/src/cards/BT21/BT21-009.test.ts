import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-009.js";

describe("BT21-009 compiled implementation", () => {
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

  it("once per turn may play Haru Shinkai from hand when linked and at most one Tamer is present", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenLinked",
            actions: [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: { controller: "mine", nameOrTrait: [{ tokens: ["Haru Shinkai"], match: "name" }] },
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
          },
        ],
      }),
    ]);
  });
});
