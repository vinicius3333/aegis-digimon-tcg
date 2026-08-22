import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-021.js";

describe("BT21-021 compiled implementation", () => {
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

  it("verifies End of Attack play/delete, On Deletion Save flow, DigiXros identity, and Xros Heart-gated Rush", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Shoutmon"] }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "SecurityAttack", amount: 1 }],
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "EndOfAttack",
        actions: [
          expect.objectContaining({
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: true,
            costReduction: 5,
            optional: true,
          }),
          expect.objectContaining({ kind: "Delete", condition: { kind: "ifThisEffectActed", raw: "you did" } }),
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [
          expect.objectContaining({ kind: "PlaceUnder" }),
          expect.objectContaining({ kind: "ActivateEffect", effectType: "Save" }),
        ],
      }),
    );
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush" },
          condition: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] } },
        },
      ],
    });
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ names: ["Shoutmon"] }], count: 2 }]);
  });
});
