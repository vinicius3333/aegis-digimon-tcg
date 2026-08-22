import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-031.js";

describe("EX11-031 Vespamon", () => {
  it("preserves both evolution requirements, face-up security scaling, and replacement effect", () => {
    const compiled = runtimeCompiledCard("EX11-031")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, cost: 4, colors: ["Green", "Black"], isAlternate: true },
      { level: 4, traits: ["Royal Base"], cost: 3, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({ kind: "Suspend", scaling: { per: 1, unit: "security", filter: { controller: "mine", faceUp: true } } });
      expect(effect.actions[1]).toMatchObject({ kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" });
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "Replacement", event: "wouldLeavePlay", cost: expect.objectContaining({ kind: "flipSecurity" }) })] }));
  });
});
