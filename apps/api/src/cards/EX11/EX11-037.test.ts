import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-037.js";

describe("EX11-037 Espimon", () => {
  it("preserves both evolution requirements and failed-flip fallback", () => {
    const compiled = runtimeCompiledCard("EX11-037")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, cost: 1, colors: ["Black", "Blue"], isAlternate: true },
      { names: ["Kapurimon"], cost: 0, isAlternate: true },
    ]);
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({ kind: "SecurityManipulation", op: "flipFaceUp", controller: "opponent" });
      expect(effect.actions[1]).toMatchObject({ kind: "Draw", amount: 1, condition: { kind: "ifThisEffectDidNotAct" } });
      expect(effect.actions[2]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "ifThisEffectDidNotAct" } });
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Static", isInherited: true, keywords: [expect.objectContaining({ keyword: "Jamming" })] }));
  });
});
