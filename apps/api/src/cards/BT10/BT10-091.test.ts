import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-091.js";

describe("BT10-091 Ruli Tsukiyono", () => {
  it("sets memory to 3 at the start of the turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-091", as: "ruli" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("ruli"));
    expect(s.state.memory).toBe(3);
  });

  it("suspends itself to suspend only a 5000-DP target when an allied level 5 attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-091", as: "ruli" },
            { card: "BT1-020", as: "level5" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atBoundary", dp: 5000 },
            { card: "BT1-009", as: "otherEligible", dp: 4000 },
            { card: "BT1-009", as: "aboveBoundary", dp: 6000 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("level5").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const targetChoice = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "BT10-091",
      options: {
        candidateInstanceIds: [s.perm("atBoundary").permanentId, s.perm("otherEligible").permanentId],
        min: 1,
        max: 1,
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("atBoundary").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.perm("atBoundary").isSuspended &&
        s.state.players[1]!.security.length === 0 &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("ruli").isSuspended).toBe(true);
    expect(s.perm("otherEligible").isSuspended).toBe(false);
    expect(s.perm("aboveBoundary").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("recognizes a level 3 Angoramon by name but cannot pay again while Ruli is suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-091", as: "ruli" },
            { card: "BT10-044", as: "angoramon" },
            { card: "BT1-020", as: "secondAttacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget", dp: 5000 },
            { card: "BT1-009", as: "secondTarget", dp: 5000 },
          ],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("angoramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("ruli").isSuspended && s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking(),
    );
    const suspendedAfterFirstAttack = [s.perm("firstTarget"), s.perm("secondTarget")].filter(
      ({ isSuspended }) => isSuspended,
    );
    expect(suspendedAfterFirstAttack).toHaveLength(1);
    const decisionsAfterFirstAttack = s.decisions.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect([s.perm("firstTarget"), s.perm("secondTarget")].filter(({ isSuspended }) => isSuspended)).toHaveLength(1);
    expect(s.decisions).toHaveLength(decisionsAfterFirstAttack);
    assertNoLoudGap(s);
  });

  it("does not observe an opponent's level 5 attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-091", as: "ruli" },
          { card: "BT1-009", as: "potentialTarget", dp: 5000 },
        ],
        security: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-020", as: "opponentLevel5" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentLevel5").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.perm("ruli").isSuspended).toBe(false);
    expect(s.perm("potentialTarget").isSuspended).toBe(false);
    expect(s.decisions).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
