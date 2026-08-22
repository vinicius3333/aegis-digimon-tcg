import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-035.js";

describe("BT21-035 compiled implementation", () => {
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

  it("preserves Armor Purge and grants +2000 DP until the opponent's turn ends", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }],
      }),
    );
    const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions).toEqual([
      {
        kind: "ModifyDP",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        amount: 2000,
        duration: "untilOpponentTurnEnd",
      },
    ]);
  });

  it("unsuspends itself once per turn when its attack target changes", () => {
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect(yourTurn?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenAttackTargetSwitched",
        actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
      },
    ]);
  });

  it("preserves the Veemon alternate Digivolution cost", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Veemon"], cost: 2, isAlternate: true }]);
  });
});
