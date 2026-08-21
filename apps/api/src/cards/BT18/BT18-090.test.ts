import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { compiled } from "./BT18-090.js";

describe("BT18-090 Zoe Orimoto", () => {
  it("has complete runtime coverage for Security, Start Main, and inherited battle-delete clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual([
      "Security",
      "StartOfYourMainPhase",
      "WhenBattleDeleteOpponent",
    ]);
    expect(compiled.effects[2]).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: { filter: { controller: "mine", kind: ["Tamer"], hasInheritedEffects: true } },
        },
      ],
    });
  });

  it("recognizes only Tamer candidates that actually carry inherited effects", () => {
    const action = compiled.effects[2]!.actions[0]!;
    if (action.kind !== "PlayWithoutCost") throw new Error("expected PlayWithoutCost");
    const filter = action.target.filter;
    expect(getCardDefinition("BT18-088").inheritedEffectText).toBeTruthy();
    expect(getCardDefinition("BT18-092").inheritedEffectText).toBeFalsy();
    expect(filter.hasInheritedEffects).toBe(true);
  });
});
