import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-029.js";

describe("BT21-029 compiled implementation", () => {
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

  it("shares one once-per-turn delete budget and creates Petrification for either opponent event", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "SecurityAttack", amount: 1 }],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Progress" }] });
    const deleteEffects = compiled.effects.filter((effect) =>
      ["WhenDigivolving", "EndOfAttack"].includes(effect.trigger),
    );
    expect(deleteEffects).toHaveLength(2);
    expect(
      deleteEffects.every((effect) => effect.frequency === "OncePerTurn" && effect.sharedUseKey === "ir-shared-0"),
    ).toBe(true);
    const tokenEffect = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(tokenEffect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [{ kind: "PlayToken", token: "Petrification", amount: 1, controller: "opponent" }],
        },
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [{ kind: "PlayToken", token: "Petrification", amount: 1, controller: "opponent" }],
        },
      ],
    });
  });
});
