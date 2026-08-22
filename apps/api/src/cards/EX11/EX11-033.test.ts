import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-033.js";

describe("EX11-033 Maneuvermon", () => {
  it("preserves both evolution requirements and keeps linked restrictions inside the trigger", () => {
    const compiled = runtimeCompiledCard("EX11-033")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, cost: 3, isAlternate: true },
      { level: 4, texts: ["Maquinamon"], cost: 3, isAlternate: true },
    ]);
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(yourTurn.actions).toHaveLength(1);
    expect(yourTurn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenLinked", actions: [
      { kind: "Suspend" },
      { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
    ] });
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenDeletesInBattle" })] }));
  });
});
