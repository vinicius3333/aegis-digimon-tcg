import { describe, it, expect } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
// Self-register every card module so the engine drives the REGISTERED BT20-065 IR.
import "../index.js";
import { compiled } from "./BT20-065.js";

/**
 * A3 — Q1f: BT20-065 (Purple Digimon) "[On Play] By trashing 1 card in your hand, give 1 of
 * your opponent's Digimon '[On Deletion] Lose 1 memory.' until the end of their turn."
 *
 * This card exercises the shared "[On Deletion] Lose 1 memory." library entry and the generic
 * cost-paying wrapper (`action.cost`/`optional`/`abortOnDecline`): the grant must depend on the
 * trash cost actually being payable.
 *
 * FAILS-WHEN-REVERTED: reverting the interpreter's routing branch or the library entry makes
 * the grant either throw when the recipient is deleted, or silently install nothing.
 */

describe("A3 BT20-065 — granted '[On Deletion] Lose 1 memory.' (costed)", () => {
  it("retains inherited Retaliation", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Retaliation" }],
    });
  });

  it("POSITIVE: paying the trash cost grants the effect; deleting the recipient costs 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-065", as: "wormmon" },
            { card: "BT1-085", as: "fodder" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "recipient" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const wormmon = s.inst("wormmon");
    const recipient = s.perm("recipient");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.memory = 5;
    s.state.turnSeat = 0;

    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: wormmon.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(() => engine.continuous.listCustomEffectGrants().length > 0, 3000);

    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some(
        (g: { instanceId: string; token: string }) =>
          g.instanceId === recipient.topCard!.instanceId && g.token === "[On Deletion] Lose 1 memory.",
      ),
    ).toBe(true);

    s.state.memory = 5; // isolate the granted effect's delta from the play/cost's own changes

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === recipient.permanentId));

    expect(s.state.memory).toBe(6); // 5 + 1
  });

  it("NEGATIVE (cost): no card in hand to trash => no grant => deletion costs nothing", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-065", as: "wormmon" }] }, // nothing left to trash after playing it
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "recipient" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const wormmon = s.inst("wormmon");
    const recipient = s.perm("recipient");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.memory = 5;
    s.state.turnSeat = 0;

    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: wormmon.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(() => !s.state.players[0]!.battleArea.every((p) => p.topCard === undefined), 3000);

    // With no card left in hand, the trash cost is unpayable: no grant installs.
    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    s.state.memory = 5;
    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === recipient.permanentId));

    expect(s.state.memory).toBe(5);
  });
});
