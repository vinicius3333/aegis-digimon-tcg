import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./LM-012.js";

describe("LM-012 Lamortmon", () => {
  it("registers both On Play and When Digivolving clauses with the conditional restriction", () => {
    const compiled = runtimeCompiledCard("LM-012")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions[0]).toEqual(expect.objectContaining({ kind: "Suspend" }));
      expect(effect.actions[1]).toEqual(expect.objectContaining({
        kind: "Restrict",
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        condition: expect.objectContaining({ kind: "opponentHasNone" }),
      }));
    }
  });

  it("keeps the inherited Angoramon battle deletion security trigger once per turn", () => {
    const inherited = runtimeCompiledCard("LM-012")!.effects.find((entry) => entry.isInherited)!;
    expect(inherited).toEqual(expect.objectContaining({ frequency: "OncePerTurn" }));
    expect(inherited.actions[0]).toEqual(expect.objectContaining({
      kind: "SubTrigger",
      event: "whenDeletesInBattle",
      actions: [expect.objectContaining({
      kind: "SecurityManipulation",
      op: "trashTop",
      controller: "opponent",
      amount: 1,
      })],
    }));
  });
});
