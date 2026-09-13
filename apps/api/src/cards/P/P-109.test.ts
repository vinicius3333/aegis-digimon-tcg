import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-109.js";

describe("P-109 Imperialdramon: Dragon Mode", () => {
  it("resolves the same suspend/unsuspend sequence on When Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-038", as: "base" }], hand: [{ card: "P-109", as: "dragon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const baseSourceInstanceId = s.perm("base").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dragon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "P-109");
    await settle();
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").stack.some((card) => card.instanceId === baseSourceInstanceId)).toBe(true);
    expect(s.perm("target").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("suspends then unsuspends a Digimon on play and may play a small card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-109", as: "dragon" },
            { card: "BT1-009", as: "small" },
          ],
          security: ["BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-109"),
    );

    const dragon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "P-109")!;
    expect(dragon.isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009")).toBe(true);
    assertNoLoudGap(s);
  });

  it("fires its once-per-turn all-turns effect once, then again after a natural turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-109", as: "dragon" },
            { card: "BT1-010", as: "target" },
          ],
          hand: [
            { card: "BT1-009", as: "small" },
            { card: "BT1-010", as: "small2" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-011", "BT1-011", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "opponent" }],
          hand: [],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT10-090"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const dragonId = s.perm("dragon").permanentId;
    const small1Id = s.inst("small").instanceId;
    const small2Id = s.inst("small2").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: dragonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking() &&
        s.perm("dragon").isSuspended &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === small1Id),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === small1Id)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === small1Id)).toBe(true);
    await advance(s.engine).verb.unsuspend([dragonId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: dragonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking() && s.perm("dragon").isSuspended,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === small2Id)).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: dragonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking() &&
        s.perm("dragon").isSuspended &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === small2Id),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === small2Id)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === small2Id)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
