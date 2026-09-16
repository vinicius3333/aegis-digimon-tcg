import { describe, it, expect } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-031.js";

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
