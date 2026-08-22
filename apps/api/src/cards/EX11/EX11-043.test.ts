import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-043.js";

describe("EX11-043 Invisimon", () => {
  it("preserves both evolution requirements and face-up security attack effect", () => {
    const compiled = runtimeCompiledCard("EX11-043")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, cost: 4, colors: ["Black", "Blue"], isAlternate: true },
      { level: 5, traits: ["Cyborg", "Machine"], cost: 3, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({ kind: "SecurityManipulation", op: "flipUp", controller: "opponent", amount: 1 });
      expect(effect.actions[1]).toMatchObject({ kind: "Return", to: "deckBottom", target: { filter: { controller: "opponent", superlative: "lowestPlayCost" } } });
      expect(effect.actions[2]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "untilYourTurnEnd" });
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "EndOfOpponentsTurn", isSecurity: true }));
  });
});
