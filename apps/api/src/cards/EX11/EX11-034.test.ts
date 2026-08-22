import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-034.js";

describe("EX11-034 QueenBeemon", () => {
  it("preserves both evolution requirements and Royal Base security/deletion effects", () => {
    const compiled = runtimeCompiledCard("EX11-034")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, cost: 4, colors: ["Green", "Black"], isAlternate: true },
      { level: 5, traits: ["Royal Base"], cost: 3, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effects = compiled.effects.filter((effect) => effect.trigger === trigger);
      expect(effects[0]).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0", actions: [{ kind: "SecurityManipulation", op: "addTopOrBottom", filter: { nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }] } }, { kind: "DeleteBudget", budget: 8 }] });
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "WhenDigivolving", sharedUseKey: "ir-shared-1", actions: [expect.objectContaining({ kind: "PlayFromZone", costReductionScaling: expect.objectContaining({ per: 1 }) })] }));
  });
});
