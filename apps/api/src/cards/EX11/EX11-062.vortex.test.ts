import { describe, it, expect } from "vitest";
import type { Permanent } from "@aegis/shared";
import type { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { GameStateAccess } from "../../engine/state/access.js";
import { validateAttack } from "../../engine/actions/attack.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js"; // register compiled cards so the real [Your Turn] recompute runs

/**
 * A3 for EX11-062 — "while your opponent has no unsuspended Digimon, your ＜Vortex＞ can also attack
 * players" (KB Q5919/Q5920/Q5921), authored over the base ＜Vortex＞ attack subsystem (08-13 Task 1).
 *
 * The base subsystem: a ＜Vortex＞-mode attack declaration (intent.vortex) targets opponent DIGIMON
 * only; a player target is illegal unless a VortexCanAttackPlayers grant relaxes it. EX11-062's
 * [Your Turn] static installs that grant on all your Digimon while the opponent has no unsuspended
 * Digimon (Q5919: also met when the opponent has no Digimon at all).
 *
 * ＜Vortex＞ attacks are synthesized at the end of your turn (docs/audits/VORTEX-TIMING-AUDIT.md);
 * a forged Main-phase `vortex: true` intent is rejected as wrong-phase, so the legality lever is
 * observed through the real turn loop: the end-turn trigger collects its targets via the same
 * canAttackTarget seam and declares against whichever legal target the controller picks.
 *
 * REAL LEVER (fails-when-reverted): WITH EX11-062 active + opponent has no unsuspended Digimon, the
 * friendly ＜Vortex＞ Digimon's end-turn attack may hit the PLAYER; revert the relaxation (drop the
 * grant) and the player is not offered (base Digimon-only rule wins) — RED. Controls: without
 * EX11-062 the grant is absent; with an UNSUSPENDED opponent Digimon present the static's condition
 * fails so only the Digimon is attackable. A NORMAL (non-Vortex) attack is unaffected.
 */

// BT25-053 carries the printed ＜Vortex＞ keyword; AD1-002 is a vanilla opponent Digimon.
const VORTEX_DIGIMON = "BT25-053";
const PLAIN_DIGIMON = "AD1-002";

function ledger(s: EngineSetup): ContinuousEffectLedger {
  return (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
}

async function recompute(s: EngineSetup): Promise<void> {
  await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
}

/** Validate an attack through the production legality path with the engine's live ledger. */
function validate(
  s: EngineSetup,
  attacker: Permanent,
  target: Parameters<typeof validateAttack>[2]["target"],
  vortex: boolean,
): ReturnType<typeof validateAttack> {
  const access = new GameStateAccess(s.state);
  return validateAttack(
    {
      state: s.state,
      access,
      combat: { isAttacking: false } as never,
      onCombatError: () => {},
      continuous: ledger(s),
    },
    0,
    { attackerPermanentId: attacker.permanentId, target, vortex },
  );
}

describe("EX11-062 — [Your Turn] grants VortexCanAttackPlayers (production recompute)", () => {
  it("records the grant on a friendly ＜Vortex＞ Digimon while opponent has no unsuspended Digimon", async () => {
    // Opponent battle area is empty => no unsuspended opponent Digimon (Q5919).
    const s = setupEngine({
      0: { battleArea: ["EX11-062", { card: VORTEX_DIGIMON, as: "vortexAttacker" }] },
    });
    const vortexAttacker = s.perm("vortexAttacker");

    await recompute(s);

    expect(ledger(s).vortexCanAttackPlayers(vortexAttacker.permanentId)).toBe(true);

    // Idempotence (CR-01): a second recompute re-derives the grant cleanly, not doubled.
    await recompute(s);
    expect(ledger(s).vortexCanAttackPlayers(vortexAttacker.permanentId)).toBe(true);
  });
});

describe("EX11-062 — ＜Vortex＞ player-attack legality (real end-of-turn flow)", () => {
  /**
   * The synthesized ＜Vortex＞ attack collects its legal targets through the production
   * canAttackTarget seam: the player only when the grant is derived, plus any opponent Digimon.
   * Preferring "player" makes the pick deterministic wherever both are offered, so a wrongly
   * derived grant shows up as a security hit and a wrongly missing one as a Digimon hit.
   *
   * `runTurn` resolves to the grant state observed in the Main phase, before the end-turn
   * ＜Vortex＞ attack: the ledger after the turn reflects the post-attack board (a deleted
   * opponent Digimon re-derives the grant), so it is not the state the attack was declared under.
   */
  function vortexTurn(board: { opponentDigimon?: { suspended: boolean }; withShoto: boolean }): {
    s: EngineSetup;
    runTurn: () => Promise<{ grantAtMain: boolean }>;
  } {
    const s = setupEngine(
      {
        0: {
          hand: ["AD1-001"],
          deck: ["AD1-001"],
          battleArea: [
            ...(board.withShoto ? ["EX11-062"] : []),
            { card: VORTEX_DIGIMON, as: "vortexAttacker", dp: 8000 },
          ],
        },
        1: {
          hand: ["AD1-001"],
          deck: ["AD1-001"],
          security: ["BT1-011"],
          battleArea:
            board.opponentDigimon === undefined
              ? []
              : [{ card: PLAIN_DIGIMON, as: "opponentDigimon", dp: 1000, suspended: board.opponentDigimon.suspended }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: ["player"] },
    );
    const runTurn = async (): Promise<{ grantAtMain: boolean }> => {
      s.state.isFirstPlayersFirstTurn = true;
      const turn = s.engine.runOneTurn();
      const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
      await settle(() => mainPhase.isOpen, 500);
      const grantAtMain = ledger(s).vortexCanAttackPlayers(s.perm("vortexAttacker").permanentId);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await turn;
      return { grantAtMain };
    };
    return { s, runTurn };
  }

  const declaredAttacks = (s: EngineSetup) => s.events.filter((event) => event.kind === "attackDeclared");
  const vortexPrompted = (s: EngineSetup): boolean =>
    s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === VORTEX_DIGIMON);

  it("WITH the relaxation, the friendly ＜Vortex＞ attack may target the player", async () => {
    // Opponent battle area is empty => Q5919 condition met => the player is a legal ＜Vortex＞ target.
    const { s, runTurn } = vortexTurn({ withShoto: true });
    const vortexAttacker = s.perm("vortexAttacker");
    const { grantAtMain } = await runTurn();

    expect(grantAtMain).toBe(true);
    expect(declaredAttacks(s)).toEqual([
      expect.objectContaining({ attackerPermanentId: vortexAttacker.permanentId, target: { kind: "player" } }),
    ]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    // REVERT-CONFIRM-RED: dropping the grant (revert EX11-062's [Your Turn] / the base
    // canAttackTarget Vortex guard) leaves no legal target => no attack => security intact => RED.
  });

  it("WITHOUT the grant (no EX11-062), the ＜Vortex＞ attack has no legal target (base Digimon-only)", async () => {
    const { s, runTurn } = vortexTurn({ withShoto: false });
    const { grantAtMain } = await runTurn();

    expect(grantAtMain).toBe(false);
    // The end-of-turn ＜Vortex＞ trigger did run (its optional prompt was answered) but the
    // player is not a legal target and no opponent Digimon exists, so nothing was declared.
    expect(vortexPrompted(s)).toBe(true);
    expect(declaredAttacks(s)).toEqual([]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("control: an UNSUSPENDED opponent Digimon fails the condition => grant not derived => Digimon only", async () => {
    const { s, runTurn } = vortexTurn({ withShoto: true, opponentDigimon: { suspended: false } });
    const vortexAttacker = s.perm("vortexAttacker");
    const opponentDigimonId = s.perm("opponentDigimon").permanentId;
    const { grantAtMain } = await runTurn();

    expect(grantAtMain).toBe(false);
    // "player" was preferred but never offered: the ＜Vortex＞ attack went to the Digimon.
    expect(declaredAttacks(s)).toEqual([
      expect.objectContaining({
        attackerPermanentId: vortexAttacker.permanentId,
        target: { kind: "permanent", permanentId: opponentDigimonId },
      }),
    ]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("control: a SUSPENDED opponent Digimon still satisfies the condition => grant derived => player legal", async () => {
    const { s, runTurn } = vortexTurn({ withShoto: true, opponentDigimon: { suspended: true } });
    const vortexAttacker = s.perm("vortexAttacker");
    const { grantAtMain } = await runTurn();

    expect(grantAtMain).toBe(true);
    // Both the player and the suspended Digimon were offered; the preferred player target won.
    expect(declaredAttacks(s)).toEqual([
      expect.objectContaining({ attackerPermanentId: vortexAttacker.permanentId, target: { kind: "player" } }),
    ]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("a NORMAL (non-Vortex) player attack is unaffected by the base subsystem (still legal)", async () => {
    // No EX11-062, an UNSUSPENDED opponent Digimon present — neither matters for a normal attack.
    const s = setupEngine({
      0: { battleArea: [{ card: PLAIN_DIGIMON, as: "plainAttacker" }] },
      1: { battleArea: [{ card: PLAIN_DIGIMON, suspended: false }] },
    });
    const plainAttacker = s.perm("plainAttacker");

    await recompute(s);

    // vortex:false => the normal attack path; player target stays unconditionally legal.
    expect(validate(s, plainAttacker, { kind: "player" }, false)).toBeNull();
  });
});
