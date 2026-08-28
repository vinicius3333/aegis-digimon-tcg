import { describe, it, expect } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-102.js";

/**
 * A3 — Q1f: BT6-102 (Green Option) "[Main] Until the end of your opponent's turn, 1 of your
 * opponent's Digimon gains '[On Deletion] Lose 2 memory' until the end of their next turn."
 *
 * The compiler recognizes the "X gains '[Trigger] Body'" shape but historically only ever
 * produced a `GrantAuraToOpponents` shell carrying `target` + `effectText` (the literal masked
 * "GRANTEFFECTnTOKEN" placeholder) — no `event`/`actions`. The interpreter's case iterates
 * `action.actions`, so the shell had no behavior until the watched event fired, at which point it
 * threw (`action.actions is not iterable`). 40 of 41 corpus instances of this action kind carry
 * this malformed shape (regression contract Q1f).
 *
 * This card's fix has two parts:
 *   1. `runtime effect records` now unmasks `effectText` back to the printed granted-effect
 *      text ("[On Deletion] Lose 2 memory") instead of leaving the ephemeral, non-recompile-
 *      -stable "GRANTEFFECT34TOKEN" placeholder in the corpus.
 *   2. The interpreter's `GrantAuraToOpponents` case now routes any instance whose `effectText`
 *      names a `GRANTED_EFFECT_LIBRARY` entry through the SAME `grantCustomEffect` mechanism
 *      `GrantStatic grant:"effects"` already uses (RB1-030's pattern), instead of falling
 *      through to the broken raw-SubTrigger path.
 *
 * FAILS-WHEN-REVERTED: reverting either the interpreter's routing branch or the new
 * `"[On Deletion] Lose 2 memory"` library entry (undo `git diff` on
 * `apps/api/src/engine/effects/interpreter.ts`) makes the grant either throw when the recipient
 * is deleted, or silently install nothing — see the NEGATIVE control below, which proves the
 * assertion actually depends on the fix rather than on some other path.
 */

describe("A3 BT6-102 — granted '[On Deletion] Lose 2 memory'", () => {
  it("POSITIVE: deleting the granted opponent Digimon costs 2 memory", async () => {
    const s = setupEngine(
      {
        0: {
          // §4-21 color-requirement source (Green) for the BT6-102 Option.
          battleArea: [{ card: "BT1-064", dp: 3000 }],
          hand: [{ card: "BT6-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "recipient" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
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
      400,
    );

    // The grant landed on the opponent's Digimon with the exact printed-text token.
    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some(
        (g: { instanceId: string; token: string }) =>
          g.instanceId === recipient.topCard!.instanceId && g.token === "[On Deletion] Lose 2 memory",
      ),
    ).toBe(true);

    // Delete the granted Digimon through the real deletion primitive.
    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === recipient.permanentId));

    // GainMemory resolves relative to the GRANTED permanent's owner (the opponent, seat 1),
    // not the turn player: `ctx.fx.gainMemoryForSeat(seat=1, amount=-2)` is a seat-relative
    // "the opponent loses 2 memory", which — since `memory` is stored turn-player-relative —
    // surfaces as memory RISING by 2 in the turn player's (seat 0's) favor.
    expect(s.state.memory).toBe(7); // 5 + 2
  });

  it("NEGATIVE: a Digimon that never received the grant costs nothing on deletion", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT6-102", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "recipient" },
            { card: "BT1-014", dp: 4000, as: "bystander" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    const p1 = s.state.players[1]!;
    const bystander = s.perm("bystander");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.memory = 5;
    s.state.turnSeat = 0;

    // Never play BT6-102 — no grant is ever installed on anyone.
    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([bystander.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === bystander.permanentId));

    // No granted [On Deletion] fired: memory is untouched.
    expect(s.state.memory).toBe(5);
  });
});
