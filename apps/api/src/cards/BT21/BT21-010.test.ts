import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-010.js";

describe("BT21-010 compiled implementation", () => {
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

  it("allows the conditional Siriusmon digivolution and grants the inherited DP bonus", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          {
            kind: "Digivolve",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Siriusmon"], match: "name" }] },
            payCost: true,
            from: ["hand"],
            costOverride: 4,
            ignoreRequirements: true,
            optional: true,
            condition: {
              kind: "orConditions",
              conditions: [
                { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 },
                {
                  kind: "permanentCount",
                  seat: "mine",
                  filter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["Hero"], match: "trait" }], distinctNames: true },
                  op: "gte",
                  value: 3,
                },
              ],
              raw: "you have 2 or fewer security cards or 3 or more [Hero] trait Tamers with different names",
            },
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
