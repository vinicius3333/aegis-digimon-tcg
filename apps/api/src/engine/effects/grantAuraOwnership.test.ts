import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

/**
 * Regression coverage for named effects granted by EX1-068's opponent aura.
 *
 * The source Option belongs to seat 0, but the granted "Lose 2 memory" effect is
 * anchored on a seat 1 Digimon. The recipient's CardSource must therefore make the
 * seat 1 player pay the memory. These tests use the production turn loop and public
 * play/attack/end-phase intents; no ledger or private engine state is used.
 */
describe("GrantAuraToOpponents recipient ownership", () => {
  it("re-derives a persistent aura once per recompute and removes it with its source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-031", as: "auraSource" }],
        security: ["BT1-001", "BT1-001", "BT1-001"],
        deck: ["BT1-001", "BT1-001", "BT1-001"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "firstAttacker", under: ["BT1-001", "BT1-002"], dp: 20_000 },
          { card: "BT1-009", as: "sourceDeleter", dp: 20_000 },
          { card: "BT1-009", as: "secondAttacker", under: ["BT1-001", "BT1-002"], dp: 20_000 },
        ],
        security: ["BT1-001", "BT1-001", "BT1-001"],
        deck: ["BT1-001", "BT1-001", "BT1-001"],
      },
    });
    const auraSourceId = s.perm("auraSource").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: auraSourceId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("auraSource").isSuspended);
    await advance(s.engine).waitForMainPhase(1);

    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstAttacker").stack.length === 1);
    expect(s.perm("firstAttacker").stack).toHaveLength(1);
    expect(s.perm("auraSource").isSuspended).toBe(true);
    expect(s.perm("sourceDeleter").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("sourceDeleter").permanentId,
        target: { kind: "permanent", permanentId: auraSourceId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === auraSourceId));
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.perm("secondAttacker").stack).toHaveLength(2);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("charges the recipient controller after a natural turn transition", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-068", as: "iceWall" }],
          battleArea: [{ card: "AD1-006", as: "colorSource" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
          deck: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
          deck: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-068"));

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    const beforeAttack = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    const memoryGain = s.events.find(
      (event) => event.kind === "memoryChanged" && event.reason === "gainMemory" && event.from === beforeAttack,
    );
    expect(memoryGain).toMatchObject({ from: beforeAttack, to: beforeAttack - 2 });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants a later entrant through the opponent turn and expires at that turn's end", async () => {
    const preferLater: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-068", as: "iceWall" }],
          battleArea: [{ card: "AD1-006", as: "colorSource" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "existing" },
            { card: "BT14-086", as: "memoryTamer" },
          ],
          hand: [
            { card: "BT14-058", as: "later" },
            { card: "BT14-086", as: "satsuki" },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferLater },
    );
    s.state.memory = 3;
    preferLater.push(s.inst("later").instanceId);
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-068"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT14-086"));
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("later").instanceId })).toEqual({ ok: true });
    await settle(() => {
      const permanent = s.state.players[1]!.battleArea.find((candidate) => candidate.topCard?.cardId === "BT14-058");
      return (
        permanent !== undefined &&
        permanent.stack.some((card) => card.cardId === "BT14-086") &&
        observe(s.engine).hasKeyword(permanent, "Rush")
      );
    });
    await settle(() =>
      observe(s.engine)
        .customEffectGrants(s.perm("later"))
        .some((grant) => grant.token === "[When Attacking] Lose 2 memory"),
    );

    const beforeLaterAttack = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("later").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    const laterMemoryGain = s.events.find(
      (event) => event.kind === "memoryChanged" && event.reason === "gainMemory" && event.from === beforeLaterAttack,
    );
    expect(laterMemoryGain).toMatchObject({ from: beforeLaterAttack, to: beforeLaterAttack - 2 });

    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();

    const grantedAttackCount = s.events.filter(
      (event) =>
        event.kind === "effectTriggered" && event.effectKey?.startsWith("granted/[When Attacking] Lose 2 memory"),
    ).length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("existing").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(
      s.events.filter(
        (event) =>
          event.kind === "effectTriggered" && event.effectKey?.startsWith("granted/[When Attacking] Lose 2 memory"),
      ),
    ).toHaveLength(grantedAttackCount);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
