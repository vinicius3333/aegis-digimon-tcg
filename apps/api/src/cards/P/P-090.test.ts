import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-090.js";

describe("P-090 Diarbbitmon", () => {
  it("requires the UI to choose exactly 2 opponent Digimon to suspend when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-075", as: "base" }],
          hand: [{ card: "P-090", as: "diarbbitmon" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;
    const baseSourceInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("diarbbitmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.options?.min).toBe(2);
    expect(decision.options?.max).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("first").permanentId, s.perm("second").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").isSuspended && s.perm("second").isSuspended);

    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.some((card) => card.instanceId === baseSourceInstanceId)).toBe(true);
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.perm("third").isSuspended).toBe(false);
  });

  it("unsuspends an ally after another Digimon wins a battle while Angoramon is in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-090", as: "diarbbitmon", suspended: true, under: ["P-060"] },
            { card: "BT1-009", as: "recipient", suspended: true },
            { card: "BT1-079", as: "attacker", dp: 9000 },
            { card: "BT1-079", as: "attacker2", dp: 9000 },
            { card: "BT1-079", as: "attacker3", dp: 9000 },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim", dp: 1000, suspended: true },
            { card: "BT1-010", as: "victim2", dp: 1000, suspended: true },
            { card: "BT1-011", as: "victim3", dp: 1000, suspended: true },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const victimId = s.perm("victim").permanentId;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("recipient").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId) &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.perm("diarbbitmon").isSuspended).toBe(false);
    expect(s.perm("recipient").isSuspended).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("recipient").permanentId]);
    const victim2Id = s.perm("victim2").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker2").permanentId,
        target: { kind: "permanent", permanentId: victim2Id },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victim2Id) &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("recipient").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("recipient").permanentId]);
    const victim3Id = s.perm("victim3").permanentId;
    await advance(s.engine).verb.suspend([victim3Id]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker3").permanentId,
        target: { kind: "permanent", permanentId: victim3Id },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victim3Id) &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("recipient").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
