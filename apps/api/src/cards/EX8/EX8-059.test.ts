import { describe, it, expect } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

/**
 * A3 — Q1f: EX8-059 (Devimon) [On Play] [When Digivolving] "By trashing 1 card in your hand,
 * give 1 of your opponent's Digimon '[On Deletion] Trash 1 card in your hand.' until the end
 * of their turn."
 *
 * Same Q1f malformed-`GrantAuraToOpponents`-shape gap as BT6-102/BT15-068/ST15-16/BT12-105/
 * EX1-068 (see BT6-102's header for the full writeup). Proves the "[On Deletion] Trash 1 card
 * in your hand." library entry, self-referential to the GRANTEE's own hand.
 *
 * FAILS-WHEN-REVERTED: reverting the interpreter's routing branch or the library entry makes
 * the grant install with no effect, so deleting the recipient never trashes any hand card.
 */

describe('A3 EX8-059 — granted "[On Deletion] Trash 1 card in your hand."', () => {
  it("POSITIVE: deleting the granted opponent Digimon trashes a card from ITS OWN controller's hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-059", as: "devimon" }, { card: "BT1-001", as: "costFodder" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 3000, as: "recipient" }],
          hand: [{ card: "BT1-001", as: "opponentHandCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const devimon = s.inst("devimon");
    const recipient = s.perm("recipient");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.turnSeat = 0;

    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: devimon.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(() => engine.continuous.listCustomEffectGrants().length > 0, 3000);

    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some(
        (g) =>
          g.instanceId === recipient.topCard!.instanceId &&
          g.token === "[On Deletion] Trash 1 card in your hand.",
      ),
    ).toBe(true);

    const handBefore = p1.hand.length;

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === recipient.permanentId));
    await settle(() => p1.hand.length < handBefore, 400);

    expect(p1.hand.length).toBe(handBefore - 1);
  });

  it("NEGATIVE: a Digimon that never received the grant costs no hand card on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-059", as: "devimon" }, { card: "BT1-001", as: "costFodder" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "recipient" },
            { card: "BT1-014", dp: 4000, as: "bystander" },
          ],
          hand: [{ card: "BT1-001", as: "opponentHandCard" }],
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

    // Never play EX8-059 — no grant is ever installed on anyone.
    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    const handBefore = p1.hand.length;

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([bystander.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === bystander.permanentId));

    expect(p1.hand.length).toBe(handBefore);
  });
});
