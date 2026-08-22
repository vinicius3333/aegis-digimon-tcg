import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-051.js";

describe("EX11-051 Necromon", () => {
  it("preserves evolution, deletion cleanup, Ghost trash play, and deletion digivolution", () => {
    const compiled = runtimeCompiledCard("EX11-051")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, cost: 3, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving", "OnDeletion"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", superlative: "lowestLevel" } } });
      expect(effect.actions[1]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], payCost: false, target: { filter: { levelComparison: { op: "lte", value: 4 }, nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] } } });
    }
    const deletionDigivolve = compiled.effects.filter((effect) => effect.trigger === "OnDeletion")[1]!;
    expect(deletionDigivolve.actions[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], payCost: false, optional: true, into: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] } });
  });
});
