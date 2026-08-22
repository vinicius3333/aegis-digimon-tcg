import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-036.js";

describe("EX11-036 Dalphomon", () => {
  it("preserves both evolution requirements and scopes inherited attack to linking", () => {
    const compiled = runtimeCompiledCard("EX11-036")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, cost: 4, isAlternate: true },
      { level: 5, texts: ["Maquinamon"], cost: 3, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger, frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" }));
    }
    const inherited = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(inherited.actions).toHaveLength(1);
    expect(inherited.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenLinked" });
    expect(inherited.actions[0].actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "Suspend" }),
      expect.objectContaining({ kind: "Attack", optional: true }),
    ]));
  });
});
