import { describe, expect, it } from "vitest";
import { type Seat } from "@aegis/shared";
import { setupEngine, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const marcusCards = ["BT4-092", "BT12-092", "BT13-095", "BT17-087", "BT21-086", "AD1-021", "ST24-13"];

describe.each([0, 1] as const)("Discord 1557489818450002040 — seat %s", (seat) => {
  it("BT12-092's own Start of Main transformation lets an established Marcus attack without granting Rush", async () => {
    const opponent = (1 - seat) as Seat;
    const s = setupEngine(
      {
        [seat]: {
          battleArea: [
            { card: "BT13-008", as: "agumon" },
            { card: "BT12-092", as: "marcus" },
          ],
          deck: Array(10).fill("BT1-009"),
        },
        [opponent]: { security: ["BT1-011", "BT1-011"], deck: Array(10).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = seat;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(seat);
      await settle(() => s.perm("marcus").canAttackPlayer && s.state.pendingDecision === undefined);
      expect(s.state.memory).toBe(9);
      expect(s.perm("marcus").currentDP).toBe(3000);
      expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(false);
      expect(
        s.engine.applyIntent(seat, {
          type: "attack",
          attackerPermanentId: s.perm("marcus").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      expect(s.perm("marcus").isSuspended).toBe(true);
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(seat, { type: "surrender" });
      await loop;
    }
  });

  it("a publicly played AD1-021 can attack that turn through its printed end-turn Rush effect", async () => {
    const opponent = (1 - seat) as Seat;
    const preferInstanceIds: string[] = [];
    const attackSnapshots: { dp: number; rush: boolean }[] = [];
    const s = setupEngine(
      {
        [seat]: {
          battleArea: [{ card: "BT13-008", as: "agumon" }],
          hand: [{ card: "AD1-021", as: "marcus" }],
          deck: Array(10).fill("BT1-009"),
        },
        [opponent]: { security: ["BT1-011", "BT1-011"], deck: Array(10).fill("BT1-009") },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds,
        onEvent: (event): void => {
          if (event.kind === "attackDeclared" && event.attackerPermanentId === s.perm("marcus").permanentId) {
            attackSnapshots.push({
              dp: s.perm("marcus").currentDP,
              rush: observe(s.engine).hasKeyword(s.perm("marcus"), "Rush"),
            });
          }
        },
      },
    );
    s.state.turnSeat = seat;
    s.state.memory = 10;
    preferInstanceIds.push(s.inst("marcus").instanceId);
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(seat);
      expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[seat]!.battleArea.length === 2 && s.state.pendingDecision === undefined);
      await settle();
      expect(s.perm("marcus").canAttackPlayer).toBe(false);
      expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(opponent);
      expect(attackSnapshots).toEqual([{ dp: 6000, rush: true }]);
      expect(s.state.players[opponent]!.security).toHaveLength(1);
      expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(false);
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(seat, { type: "surrender" });
      await loop;
    }
  });

  it.each(marcusCards)("Agumon transforms established %s and its projected attack succeeds", async (card) => {
    const opponent = (1 - seat) as Seat;
    const s = setupEngine(
      {
        [seat]: {
          battleArea: [
            { card: "BT13-008", as: "agumon" },
            { card, as: "marcus" },
          ],
          deck: Array(10).fill("BT1-009"),
        },
        [opponent]: { security: ["BT1-011", "BT1-011"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.turnSeat = seat;
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("marcus").canAttackPlayer).toBe(false);
    await settle();
    const effect = observe(s.engine).activatableEffects(s.perm("agumon"))[0]!;
    expect(
      s.engine.applyIntent(seat, {
        type: "activateEffect",
        sourceInstanceId: s.inst("agumon").instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("marcus").canAttackPlayer && s.state.pendingDecision === undefined);
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(
      s.engine.applyIntent(seat, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(
      s.events.some((e) => e.kind === "attackDeclared" && e.attackerPermanentId === s.perm("marcus").permanentId),
    ).toBe(true);
    expect(s.perm("marcus").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it.each(marcusCards)(
    "publicly played %s remains unable to attack after Agumon's no-Rush transformation",
    async (card) => {
      const opponent = (1 - seat) as Seat;
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [{ card: "BT13-008", as: "agumon" }],
            hand: [{ card, as: "marcus" }],
            deck: Array(10).fill("BT1-009"),
          },
          [opponent]: { security: ["BT1-011", "BT1-011"] },
        },
        { autoSelectCards: true, autoDeclineOptional: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[seat]!.battleArea.length === 2 && s.state.pendingDecision === undefined);
      await settle();
      const effect = observe(s.engine).activatableEffects(s.perm("agumon"))[0]!;
      expect(
        s.engine.applyIntent(seat, {
          type: "activateEffect",
          sourceInstanceId: s.inst("agumon").instanceId,
          effectKey: effect.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("marcus").currentDP === 3000 && s.state.pendingDecision === undefined);
      await settle();
      expect(s.perm("marcus").enterFieldTurnCount).toBe(s.state.turnCount);
      expect(s.perm("marcus").summoningSick).toBe(true);
      expect(s.perm("marcus").canAttackPlayer).toBe(false);
      expect(s.perm("marcus").attackablePermanentIds).toHaveLength(0);
      expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(false);
      expect(
        s.engine.applyIntent(seat, {
          type: "attack",
          attackerPermanentId: s.perm("marcus").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: false, reason: "illegal-target" });
      expect(s.events.some((e) => e.kind === "attackDeclared")).toBe(false);
      expect(s.perm("marcus").isSuspended).toBe(false);
      assertNoLoudGap(s);
    },
  );
});
