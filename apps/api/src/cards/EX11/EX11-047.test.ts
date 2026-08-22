import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-047.js";

describe("EX11-047 Impmon", () => {
  it("preserves both evolution requirements and start-main-phase hand cost", () => {
    const compiled = runtimeCompiledCard("EX11-047")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, cost: 1, colors: ["Purple", "Red"], isAlternate: true },
      { names: ["Yaamon"], cost: 0, isAlternate: true },
    ]);
    const start = compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")!;
    expect(start.actions[0]).toMatchObject({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } });
    expect(start.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "YourTurn", isInherited: true, actions: [expect.objectContaining({ kind: "ModifyDP", amount: 2000 })] }));
  });
});
