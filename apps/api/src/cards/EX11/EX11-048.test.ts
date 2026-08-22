import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-048.js";

describe("EX11-048 Ghostmon", () => {
  it("preserves evolution, Ghost targeting, Retaliation duration, and inherited memory", () => {
    const compiled = runtimeCompiledCard("EX11-048")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, cost: 0, isAlternate: true }]);
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({ kind: "GainKeyword", duration: "untilOpponentTurnEnd", keyword: { keyword: "Retaliation" }, target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] } } });
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "OnDeletion", isInherited: true, actions: [{ kind: "GainMemory", amount: 1 }] }));
  });
});
