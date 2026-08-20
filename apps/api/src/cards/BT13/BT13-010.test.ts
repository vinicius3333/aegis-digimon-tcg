import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-010.js";

describe("BT13-010 Biyomon", () => {
  it("requires effect-play and returns Kristy Damon before optional Garudamon digivolution", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [{
        kind: "Digivolve",
        payCost: false,
        from: ["hand"],
        ignoreRequirements: true,
        optional: true,
        abortOnDecline: true,
        condition: { kind: "triggerEnteredByEffect" },
        cost: {
          kind: "return",
          target: { count: 1, filter: { nameOrTrait: [{ match: "name", tokens: ["Kristy Damon"] }] } },
        },
        into: { nameOrTrait: [{ match: "name", tokens: ["Garudamon"] }] },
      }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
  });
});
