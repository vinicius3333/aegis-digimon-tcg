import { describe, it, expect } from "vitest";
import type { Permanent } from "@aegis/shared";
import type { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { GameStateAccess } from "../../engine/state/access.js";
import { validateAttack } from "../../engine/actions/attack.js";
import { setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
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
 * REAL LEVER (fails-when-reverted): WITH EX11-062 active + opponent has no unsuspended Digimon, a
 * friendly ＜Vortex＞ Digimon's ＜Vortex＞-mode player attack is LEGAL; revert the relaxation (drop the
 * grant) and that player attack is ILLEGAL (base Digimon-only rule wins) — RED. Controls: without
 * EX11-062 the grant is absent (illegal); with an UNSUSPENDED opponent Digimon present the static's
 * condition fails so the grant is not derived (illegal). A NORMAL (non-Vortex) attack is unaffected.
 */

// BT25-053 carries the printed ＜Vortex＞ keyword; AD1-002 is a vanilla opponent Digimon.
const VORTEX_DIGIMON = "BT25-053";
const PLAIN_DIGIMON = "AD1-002";

function ledger(s: EngineSetup): ContinuousEffectLedger {
  return (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
}

async function recompute(s: EngineSetup): Promise<void> {
  await (
    s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }
  ).recomputeContinuousEffects();
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
    // REVERT-CONFIRM-RED: emptying EX11-062's [Your Turn] actions (the prior RawUnparsed residual)
    // => the grant is never recorded => this assertion goes RED.

    // Idempotence (CR-01): a second recompute re-derives the grant cleanly, not doubled.
    await recompute(s);
    expect(ledger(s).vortexCanAttackPlayers(vortexAttacker.permanentId)).toBe(true);
  });
});

describe("EX11-062 — ＜Vortex＞ player-attack legality (real lever)", () => {
  it("WITH the relaxation, the friendly ＜Vortex＞ player attack is LEGAL", async () => {
    const s = setupEngine({
      0: { battleArea: ["EX11-062", { card: VORTEX_DIGIMON, as: "vortexAttacker" }] },
    });
    const vortexAttacker = s.perm("vortexAttacker");

    await recompute(s);

    // ＜Vortex＞-mode declaration against a player: legal because the grant was derived.
    expect(validate(s, vortexAttacker, { kind: "player" }, true)).toBeNull();
    // REVERT-CONFIRM-RED: dropping the grant (revert EX11-062's [Your Turn] / the base
    // canAttackTarget Vortex guard) => the player attack is illegal-target => RED.
  });

  it("WITHOUT the grant (no EX11-062), the ＜Vortex＞ player attack is ILLEGAL (base Digimon-only)", async () => {
    // A friendly ＜Vortex＞ Digimon but NO EX11-062 on the field => no grant derived.
    const s = setupEngine({
      0: { battleArea: [{ card: VORTEX_DIGIMON, as: "vortexAttacker" }] },
    });
    const vortexAttacker = s.perm("vortexAttacker");

    await recompute(s);
    expect(ledger(s).vortexCanAttackPlayers(vortexAttacker.permanentId)).toBe(false);
    expect(validate(s, vortexAttacker, { kind: "player" }, true)).toBe("illegal-target");
  });

  it("control: an UNSUSPENDED opponent Digimon fails the condition => grant not derived => illegal", async () => {
    // Opponent has an UNSUSPENDED Digimon => "no unsuspended Digimon" condition is FALSE.
    const s = setupEngine({
      0: { battleArea: ["EX11-062", { card: VORTEX_DIGIMON, as: "vortexAttacker" }] },
      1: { battleArea: [{ card: PLAIN_DIGIMON, suspended: false }] },
    });
    const vortexAttacker = s.perm("vortexAttacker");

    await recompute(s);

    expect(ledger(s).vortexCanAttackPlayers(vortexAttacker.permanentId)).toBe(false);
    expect(validate(s, vortexAttacker, { kind: "player" }, true)).toBe("illegal-target");
  });

  it("control: a SUSPENDED opponent Digimon still satisfies the condition => grant derived => legal", async () => {
    // Opponent's only Digimon is SUSPENDED => "no UNSUSPENDED Digimon" still holds.
    const s = setupEngine({
      0: { battleArea: ["EX11-062", { card: VORTEX_DIGIMON, as: "vortexAttacker" }] },
      1: { battleArea: [{ card: PLAIN_DIGIMON, suspended: true }] },
    });
    const vortexAttacker = s.perm("vortexAttacker");

    await recompute(s);

    expect(ledger(s).vortexCanAttackPlayers(vortexAttacker.permanentId)).toBe(true);
    expect(validate(s, vortexAttacker, { kind: "player" }, true)).toBeNull();
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
