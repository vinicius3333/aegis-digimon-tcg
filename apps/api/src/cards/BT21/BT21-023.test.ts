import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-023.js";

describe("BT21-023 compiled implementation", () => {
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

  it("links a level 4 or lower Digimon from the default hand/stack zones and deletes an equal-or-lower DP opponent once per turn", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            {
              kind: "Link",
              target: {
                filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
                count: 1,
              },
              payCost: false,
              optional: true,
            },
          ],
        }),
      );
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenLinked",
            actions: [
              {
                kind: "Delete",
                target: {
                  filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
                  count: 1,
                },
              },
            ],
          },
        ],
      }),
    );
    expect(compiled.appFusionRequirement).toEqual([{ names: ["DoGatchmon", "Timemon"], cost: 0 }]);
  });
});
