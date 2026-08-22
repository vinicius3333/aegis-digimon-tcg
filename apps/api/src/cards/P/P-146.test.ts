import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-146.js";

describe("P-146 Recharge Plug-In Q", () => {
  it("waives its color requirement with a Tamer and places itself under a non-white Digimon", () => {
    const compiled = runtimeCompiledCard("P-146")!;
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { kind: ["Tamer"] } } }] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "Main", actions: [{ kind: "PlaceUnder", underFilter: { kind: ["Digimon"], excludeColors: ["White"] } }] });
  });

  it("limits both inherited and Security replacement effects to battle deletion", () => {
    const compiled = runtimeCompiledCard("P-146")!;
    const replacements = compiled.effects.filter((effect) => effect.actions.some((action) => action.kind === "Replacement"));
    expect(replacements).toHaveLength(2);
    for (const effect of replacements) {
      expect(effect.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldBeDeleted", leaveCause: "byBattle" });
    }
    expect(compiled.effects[1]).toMatchObject({ trigger: "Security", actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "forTheTurn" }] });
  });
});
