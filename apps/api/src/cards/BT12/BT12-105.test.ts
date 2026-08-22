import { describe, it, expect } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

/**
 * A3 — Q1f: BT12-105 (Spiking Strike) [Main] "Until the end of your opponent's turn, 1 of
 * your opponent's Digimon gains '[On Deletion] Trash the top card of your security stack.'
 * Then, if you have a blue Digimon in play, you may play 1 green level 4 or lower Digimon
 * card with a [Free] trait from your hand without paying its cost."
 *
 * Same Q1f malformed-`GrantAuraToOpponents`-shape gap as BT6-102/BT15-068/ST15-16 (see
 * BT6-102's header for the full writeup). Proves the SHARED "[On Deletion] Trash the top card
 * of your security stack." library entry (also granted by BT15-095) and its self-referential
 * "your" — KB Q2241 confirms deleting the GRANTED Digimon trashes ITS OWN controller's (the
 * opponent's) top security card, not the caster's.
 *
 * FAILS-WHEN-REVERTED: reverting the interpreter's routing branch or the library entry makes
 * the grant install with no effect, so deleting the recipient never trashes any security.
 */

describe('A3 BT12-105 — granted "[On Deletion] Trash the top card of your security stack."', () => {
  it("registers the printed Security activation", () => {
    const module = getEffectModule("BT12-105");
    const source = { instanceId: "source-105", cardId: "BT12-105", ownerSeat: 0, isOnBattleArea: () => false } as never;
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("POSITIVE: deleting the granted opponent Digimon trashes the top of ITS OWN controller's security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-105", as: "spikingStrike" }],
          battleArea: [{ card: "AD1-011", dp: 2000, as: "colorSource" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "recipient" }], security: ["BT1-001", "BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const spikingStrike = s.inst("spikingStrike");
    const recipient = s.perm("recipient");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.turnSeat = 0;

    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: spikingStrike.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(() => engine.continuous.listCustomEffectGrants().length > 0, 3000);

    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some(
        (g) =>
          g.instanceId === recipient.topCard!.instanceId &&
          g.token === "[On Deletion] Trash the top card of your security stack.",
      ),
    ).toBe(true);

    const securityBefore = p1.security.length;

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === recipient.permanentId));
    await settle(() => p1.security.length < securityBefore, 400);

    expect(p1.security.length).toBe(securityBefore - 1);
  });

  it("NEGATIVE: a Digimon that never received the grant costs no security on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-105", as: "spikingStrike" }],
          battleArea: [{ card: "AD1-011", dp: 2000, as: "colorSource" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "recipient" },
            { card: "BT1-014", dp: 4000, as: "bystander" },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const bystander = s.perm("bystander");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.turnSeat = 0;

    // Never play BT12-105 — no grant is ever installed on anyone.
    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    const securityBefore = p1.security.length;

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([bystander.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === bystander.permanentId));

    expect(p1.security.length).toBe(securityBefore);
  });
});
