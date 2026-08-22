import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-045.js";

describe("EX11-045 Metatromon", () => {
  it("preserves both evolution requirements and event-scoped inherited deletion", () => {
    const compiled = runtimeCompiledCard("EX11-045")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, cost: 4, isAlternate: true },
      { level: 5, texts: ["Maquinamon"], cost: 3, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0", actions: [{ kind: "DeDigivolve", amount: 2 }, { kind: "Restrict", restriction: "digivolve", duration: "untilOpponentTurnEnd" }] });
    }
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", sourceFilter: { isSelfRef: true } }] });
    expect(inherited.actions[0].actions[0]).toMatchObject({ kind: "Delete", target: { filter: { superlative: "lowestPlayCost" } } });
  });
});
