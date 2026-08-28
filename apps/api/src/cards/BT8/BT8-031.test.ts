import { describe, it, expect } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-031.js";

/**
 * A3 — Q1f: BT8-031 (FrosVelgrmon) "[Opponent's Turn] All of your opponent's Digimon gain
 * '[When Attacking] Trash the bottom digivolution card of this Digimon.'"
 *
 * Same Q1f malformed-`GrantAuraToOpponents`-shape gap as BT6-102/BT15-068/ST15-16/BT12-105/
 * EX1-068/EX8-059 (see BT6-102's header for the full writeup). The outer `[Opponent's Turn]`
 * wrapper only gates WHEN the grant is (re-)installed each continuous recompute (idempotent);
 * the granted body's own timing is the ordinary discrete `WhenAttacking` window.
 *
 * FAILS-WHEN-REVERTED: reverting the interpreter's routing branch or the library entry makes
 * the grant install with no effect, so attacking never trashes any digivolution card.
 */

describe('BT8-031 FrosVelgrmon — granted "[When Attacking] Trash the bottom digivolution card of this Digimon."', () => {
  it("POSITIVE: attacking with the granted opponent Digimon trashes its own bottom digivolution card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-031", dp: 5000, as: "frosVelgrmon" }] },
        1: {
          battleArea: [
            {
              card: "BT1-014",
              dp: 3000,
              as: "attacker",
              under: [
                { card: "BT1-001", as: "bottomCard" },
                { card: "BT1-009", as: "topCard" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attacker = s.perm("attacker");
    const bottomCard = s.inst("bottomCard");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    // BT8-031's grant is itself installed via a continuous [Opponent's Turn] recompute.
    s.state.turnSeat = 1;
    await engine.recomputeContinuousEffects();

    await settle(() => engine.continuous.listCustomEffectGrants().length > 0, 2000);

    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some(
        (g) =>
          g.instanceId === attacker.topCard!.instanceId &&
          g.token === "[When Attacking] Trash the bottom digivolution card of this Digimon.",
      ),
    ).toBe(true);

    const stackBefore = attacker.stack.length;

    const attackRes = engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(attackRes).toEqual({ ok: true });

    await settle(() => attacker.stack.length < stackBefore, 400);

    expect(attacker.stack.length).toBe(stackBefore - 1);
    // The BOTTOM card specifically left the stack, not the top one.
    expect(attacker.stack.some((c) => c.instanceId === bottomCard.instanceId)).toBe(false);
  });

  it("NEGATIVE: without the grant, attacking leaves the digivolution stack untouched", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", dp: 2000, as: "bystander0" }] },
        1: {
          battleArea: [
            {
              card: "BT1-014",
              dp: 3000,
              as: "attacker",
              under: [
                { card: "BT1-001", as: "bottomCard" },
                { card: "BT1-009", as: "topCard" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attacker = s.perm("attacker");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    // No BT8-031 on the board — no grant is ever installed on anyone.
    s.state.turnSeat = 1;
    await engine.recomputeContinuousEffects();
    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    const stackBefore = attacker.stack.length;

    const attackRes = engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(attackRes).toEqual({ ok: true });

    await settle(() => false, 200);

    expect(attacker.stack.length).toBe(stackBefore);
  });
});
