import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-052.js";

describe("EX11-052 HeavyMetaldramon", () => {
  it("preserves both evolution requirements, unsuspended deletion, and leave-play security replacement", () => {
    const compiled = runtimeCompiledCard("EX11-052")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, cost: 5, colors: ["Purple", "Red"], isAlternate: true },
      { level: 5, traits: ["Dark Dragon", "Evil Dragon"], cost: 3, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving", "EndOfAttack"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[1]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true } } });
      expect(effect.actions[2]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], condition: { kind: "zoneCount", op: "lte", value: 4 } });
    }
    const replacement = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(replacement.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", condition: { kind: "zoneCount", op: "lte", value: 4 }, actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }] });
  });
});
