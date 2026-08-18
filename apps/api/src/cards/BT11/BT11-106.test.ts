import { describe, it, expect } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
// Self-register every card module so the engine drives the REGISTERED BT11-106 IR.
import "../index.js";

/**
 * A3 — Q1f: BT11-106 (Black Option) "[Main] Until the end of your opponent's turn, 1 of your
 * Digimon with [Numemon], [Sukamon], [Nanimon], or [Etemon] in its name ... gains '[On Deletion]
 * Gain 3 memory.'"
 *
 * Same Q1f malformed-shape gap as BT6-102 (see that file's header for the full writeup), but
 * this card exercises two things BT6-102 doesn't:
 *   - the grant targets the CONTROLLER's OWN Digimon, not the opponent's — proving the
 *     `GRANTED_EFFECT_LIBRARY` route resolves `GainMemory`'s seat-relative sign correctly in
 *     BOTH directions (BT6-102: opponent-owned recipient; this card: controller-owned recipient).
 *   - a distinct new library entry ("[On Deletion] Gain 3 memory.", trailing period, positive
 *     amount) rather than the "Lose N memory" shape.
 *
 * (The card's compiler output also drops the co-occurring "can't be blocked" clause entirely —
 * a separate, pre-existing gap outside Q1f's scope; this test only proves the granted-effect
 * half this fix addresses.)
 *
 * FAILS-WHEN-REVERTED: reverting the interpreter's routing branch or the new library entry
 * makes the grant either throw when the recipient is deleted, or silently install nothing.
 */

describe("A3 BT11-106 — granted '[On Deletion] Gain 3 memory.'", () => {
  it("POSITIVE: deleting the granted OWN Digimon gains 3 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-056", dp: 1000, as: "recipient" }], // Numemon (Black), vanilla
          hand: [{ card: "BT11-106", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const option = s.inst("option");
    const recipient = s.perm("recipient");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.memory = 5;
    s.state.turnSeat = 0;

    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(
      () =>
        !p0.hand.some((c) => c.instanceId === option.instanceId) &&
        engine.continuous.listCustomEffectGrants().length > 0,
      3000,
    );

    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some(
        (g: { instanceId: string; token: string }) =>
          g.instanceId === recipient.topCard!.instanceId &&
          g.token === "[On Deletion] Gain 3 memory.",
      ),
    ).toBe(true);

    // Reset to a clean baseline AFTER the play cost was paid, so the assertion below isolates
    // the granted effect's own delta from the card's own play cost.
    s.state.memory = 5;

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => !p0.battleArea.some((p) => p.permanentId === recipient.permanentId));

    // The granted permanent is the CONTROLLER's own (same seat as turnSeat): GainMemory
    // resolves relative to that seat directly, so memory rises by exactly 3.
    expect(s.state.memory).toBe(8); // 5 + 3
  });

  it("NEGATIVE: a same-name Digimon that never received the grant costs nothing on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-056", dp: 1000, as: "recipient" },
            { card: "BT11-041", dp: 7000, as: "bystander" }, // Etemon — also name-eligible
          ],
          hand: [{ card: "BT11-106", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const bystander = s.perm("bystander");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.memory = 5;
    s.state.turnSeat = 0;

    // Never play BT11-106 — no grant is ever installed on anyone.
    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([bystander.permanentId], "byEffect");
    await settle(() => !p0.battleArea.some((p) => p.permanentId === bystander.permanentId));

    expect(s.state.memory).toBe(5);
  });
});
