import { describe, it, expect } from "vitest";
import { Phase } from "@aegis/shared";
import { registerIrCard, runtimeCompiledCard } from "../effects/interpreter.js";
import { unregisterCard } from "../effects/registry.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * End-to-end wiring of the attack/declareBlock/declineBlock verbs through
 * GameEngine.applyIntent (subsystem: attack-and-block). Exercises the full path:
 * intent validation -> CombatController -> (block window) -> combat resolution /
 * security-and-win-check hand-off. The board is set up directly (deck-and-setup is
 * a separate subsystem) and the turn cursor placed in seat 0's Main phase.
 */

const DIGIMON_A = "AD1-001";
const DIGIMON_B = "AD1-002";
// A Digimon whose printed text is exactly "＜Blocker＞." — used where a legal blocker is
// needed (Comprehensive Rules §16-5: only a Digimon with ＜Blocker＞ may block). Its IR
// module is NOT imported here, so it contributes no effects beyond being a valid blocker.
const BLOCKER_CARD = "ST18-07";

describe("GameEngine.applyIntent — attack wiring", () => {
  it("rejects an attack out of phase", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: DIGIMON_A, dp: 5000, as: "attacker" }] } });
    s.state.phase = Phase.Breeding;
    const attacker = s.perm("attacker");

    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(result).toEqual({ ok: false, reason: "wrong-phase" });
  });

  it("rejects an attack from the non-turn player", () => {
    const s = setupEngine({ 1: { battleArea: [{ card: DIGIMON_A, dp: 5000, as: "attacker" }] } });
    const attacker = s.perm("attacker");

    const result = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(result).toEqual({ ok: false, reason: "not-your-turn" });
  });

  it("resolves a player-directed attack into empty security as a win", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: DIGIMON_A, dp: 5000, as: "attacker" }] } });
    const attacker = s.perm("attacker");
    // seat 1 has no security and no blockers.

    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.state.gameOver, 1000);

    expect(s.state.gameOver).toBe(true);
    expect(s.state.winnerSeat).toBe(0);
    expect(s.events.some((e) => e.kind === "gameOver" && e.reason === "security")).toBe(true);
  });

  it("a Digimon-vs-Digimon attack deletes the weaker defender", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: DIGIMON_A, dp: 9000, as: "attacker" }] },
      1: { battleArea: [{ card: DIGIMON_B, dp: 3000, suspended: true, as: "defender" }] },
    });
    const attacker = s.perm("attacker");
    const defender = s.perm("defender");

    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "permanent", permanentId: defender.permanentId },
    });
    expect(result).toEqual({ ok: true });
    await settle(() => (s.state.players[1]?.battleArea.length ?? 1) === 0, 1000);

    expect(s.state.players[1]?.battleArea).toHaveLength(0);
    expect(s.state.players[0]?.battleArea).toHaveLength(1);
  });
});

describe("GameEngine.applyIntent — block wiring", () => {
  it("declareBlock during an open window redirects combat onto the blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: DIGIMON_A, dp: 6000, as: "attacker" }] },
      1: {
        battleArea: [{ card: BLOCKER_CARD, dp: 2000, as: "blocker" }], // unsuspended ＜Blocker＞ -> eligible
        security: [DIGIMON_A],
      },
    });
    const attacker = s.perm("attacker");
    const blocker = s.perm("blocker");

    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"), 1000);

    const block = s.engine.applyIntent(1, {
      type: "declareBlock",
      blockerPermanentId: blocker.permanentId,
    });
    expect(block).toEqual({ ok: true });
    await settle(() => (s.state.players[1]?.battleArea.length ?? 1) === 0, 1000);

    // Blocker battled the 6000 attacker and was deleted; security untouched.
    expect(s.state.players[1]?.battleArea).toHaveLength(0);
    expect(s.state.players[1]?.security).toHaveLength(1);
  });

  it("keeps a surviving blocker suspended after combat", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: DIGIMON_A, dp: 2000, as: "attacker" }] },
      1: {
        battleArea: [{ card: BLOCKER_CARD, dp: 6000, as: "blocker" }],
        security: [DIGIMON_A],
      },
    });
    const attackerId = s.perm("attacker").permanentId;
    const blockerId = s.perm("blocker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"), 1000);
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: blockerId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId), 1000);

    const survivingBlocker = s.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === blockerId);
    expect(survivingBlocker?.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("rejects declareBlock when there is no open window", () => {
    const s = setupEngine({ 1: { battleArea: [{ card: DIGIMON_A, dp: 2000, as: "blocker" }] } });
    const blocker = s.perm("blocker");

    const result = s.engine.applyIntent(1, {
      type: "declareBlock",
      blockerPermanentId: blocker.permanentId,
    });
    expect(result).toEqual({ ok: false, reason: "wrong-phase" });
  });

  it("declineBlock lets the attack proceed; rejects when no window is open", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: DIGIMON_A, dp: 6000, as: "attacker" }] },
      1: {
        battleArea: [{ card: BLOCKER_CARD, dp: 2000, as: "blocker" }],
        security: [DIGIMON_A],
      },
    });
    const attacker = s.perm("attacker");

    // No open window yet.
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({
      ok: false,
      reason: "wrong-phase",
    });

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"), 1000);

    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    // Wait for the full security check to land the checked card in trash (the
    // shift from `security` happens a few microtasks before the trash push).
    await settle(() => (s.state.players[1]?.trash.length ?? 0) >= 1, 1000);

    // Declined block + 1 security => security checked (the lone security card,
    // a Digimon AD1-001 @5000, battles the 6000 attacker and is trashed).
    expect(s.state.players[1]?.security).toHaveLength(0);
    expect(s.state.players[1]?.trash.length).toBeGreaterThanOrEqual(1);
  });

  it("still ends the turn when a combat effect throws after memory crossed", async () => {
    // The field repro (api.log 2026-08-20): an UnsupportedEffectError escaped combat
    // resolution AFTER an effect had pushed memory across. The success path's final
    // turn-end check lives in onCombatComplete, which a rejected combat promise skips —
    // so the Main phase hung open with memory on the opponent's side, no further verb
    // was legal to re-trigger the check, and only a manual endPhase closed the turn.
    // Give the attacker an End of Attack effect that first drains memory across, then
    // hits the interpreter's legacy-payload guard exactly as the logged match did.
    const originalCompiled = runtimeCompiledCard(DIGIMON_B);
    try {
      registerIrCard(DIGIMON_B, {
        effects: [
          {
            trigger: "EndOfAttack",
            actions: [{ kind: "GainMemory", amount: -3 }, { kind: "ActivateEffect" }],
          },
        ],
        coverage: "full",
        residual: [],
      } as never);
      const s = setupEngine({
        0: { battleArea: [{ card: DIGIMON_B, dp: 9000, as: "attacker" }], deck: [DIGIMON_A, DIGIMON_A] },
        1: { deck: [DIGIMON_A, DIGIMON_A], security: [DIGIMON_A] },
      });
      await s.ready();

      let turnClosed = false;
      const turn = s.engine.runOneTurn().then(() => {
        turnClosed = true;
      });
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = 2;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });

      await settle(() => turnClosed, 1000);
      expect(s.events.some((e) => e.kind === "actionRejected" && e.intent === "attack")).toBe(true);
      expect(turnClosed).toBe(true);
      await turn;
    } finally {
      // Vitest runs this file with a shared module graph. Restore the real IR after the
      // synthetic throw-path card so later AD1-002 tests cannot resolve this test payload.
      unregisterCard(DIGIMON_B);
      if (originalCompiled !== undefined) registerIrCard(DIGIMON_B, originalCompiled);
    }
  });
});
