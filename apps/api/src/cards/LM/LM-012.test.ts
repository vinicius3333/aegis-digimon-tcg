import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-012.js";

describe("LM-012 Lamortmon", () => {
  it("publicly suspends the last opposing Digimon and prevents its unsuspension", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "LM-012", as: "lamortmon" }] },
      1: { battleArea: [{ card: "ST1-08", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lamortmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);

    const continuous = (s.engine as unknown as { continuous: { hasRestriction: (id: string, restriction: string) => boolean } }).continuous;
    await settle(() => continuous.hasRestriction(s.perm("target").permanentId, "unsuspend"));
    expect(continuous.hasRestriction(s.perm("target").permanentId, "unsuspend")).toBe(true);
  });

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
