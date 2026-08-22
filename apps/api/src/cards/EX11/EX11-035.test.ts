import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-035.js";

describe("EX11-035 Zephagamon", () => {
  it("preserves evolution, cross-player digivolving choices, and event-scoped DP scaling", () => {
    const compiled = runtimeCompiledCard("EX11-035")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, cost: 3, isAlternate: true }]);
    const digivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")!;
    expect(digivolving.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "Unsuspend", optional: true, target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 } }),
      expect.objectContaining({ kind: "Suspend", optional: true, target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 } }),
    ]));
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(allTurns.actions).toHaveLength(1);
    expect(allTurns.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(allTurns.actions[0].actions[0]).toMatchObject({ kind: "PlayWithoutCost", dpCeilingModifier: { mode: "raiseCeiling", amount: 2000 } });
  });
});
