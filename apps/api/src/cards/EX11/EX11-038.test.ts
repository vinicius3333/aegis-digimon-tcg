import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-038.js";

describe("EX11-038 Sunarizamon", () => {
  it("preserves evolution, cross-stack trash cost, and inherited discard trigger", () => {
    const compiled = runtimeCompiledCard("EX11-038")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, cost: 0, isAlternate: true }]);
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({ kind: "Draw", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "trash", target: { from: ["hand", "digivolutionCards"], count: 1 } } });
      expect(effect.actions[0].cost.target.filter.nameOrTrait).toEqual([{ tokens: ["Mineral", "Rock"], match: "trait" }]);
    }
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({ trigger: "Static", actions: [{ kind: "SubTrigger", event: "onDigivolutionCardDiscarded", sourceFilter: { controller: "mine" }, actions: [{ kind: "Draw", amount: 1 }] }] });
  });
});
