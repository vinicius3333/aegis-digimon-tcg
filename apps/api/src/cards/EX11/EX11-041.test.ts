import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-041.js";

describe("EX11-041 Oblivimon", () => {
  it("preserves both evolution requirements, face-down security flip, and turn condition", () => {
    const compiled = runtimeCompiledCard("EX11-041")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, cost: 4, colors: ["Black", "Blue"], isAlternate: true },
      { level: 4, traits: ["Cyborg"], cost: 3, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({ kind: "SecurityManipulation", op: "flipUp", controller: "opponent", amount: 1 });
      expect(effect.actions[1]).toMatchObject({ kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent", kind: ["Digimon"] } } });
      expect(effect.actions[2]).toMatchObject({ kind: "Digivolve", from: ["hand"], condition: { kind: "isOpponentsTurn" } });
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "EndOfOpponentsTurn", isSecurity: true }));
  });
});
