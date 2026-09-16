import { Phase, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-005 Hopmon", () => {
  it("grants only its host ＜Reboot＞ on the opponent's turn while they have a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-052", as: "host", under: ["BT19-005"] },
          { card: "BT2-052", as: "ownPeer" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-028", as: "opponentDigimon" },
          { card: "BT1-088", as: "opponentTamer" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ownPeer"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponentDigimon"), "Reboot")).toBe(false);

    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).verb.deletePermanent([s.perm("opponentDigimon").permanentId], "byEffect");
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("opponentTamer").permanentId,
    ]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
  });

  it("actually unsuspends the host during the opponent's unsuspend phase, while a plain peer stays suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "host", dp: 20_000, under: ["BT19-005"] },
            { card: "BT2-052", as: "plainPeer", dp: 20_000 },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-028", as: "opponentDigimon" }],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013", "BT1-012", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
    for (const alias of ["host", "plainPeer"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(alias).isSuspended && !observe(s.engine).isAttacking());
    }
    expect(s.state.turnSeat).toBe(0);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("plainPeer").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("plainPeer").isSuspended).toBe(true);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves the host suspended through the opponent's turn when the opponent has no Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-052", as: "host", dp: 20_000, under: ["BT19-005"] }],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-088", as: "opponentTamer" }],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013", "BT1-012", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.turnSeat).toBe(0);
    expect(s.perm("host").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
    expect(s.perm("host").isSuspended).toBe(true);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("carries ＜Reboot＞ through the real Digi-Egg route: hatch -> digivolve in breeding -> battle area", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT19-005", as: "egg" }],
          hand: [{ card: "BT2-052", as: "hagurumon" }],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "opponentDigimon" },
            { card: "BT1-088", as: "opponentTamer" },
          ],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT19-005");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("hagurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-052");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect((s.state.players[0] as PlayerState).hand.some(({ cardId }) => cardId === "BT2-052")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.topCard!.cardId).toBe("BT2-052");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(carrier, "Reboot")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(carrier, "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("opponentDigimon"), "Reboot")).toBe(false);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
