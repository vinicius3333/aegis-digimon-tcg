import { describe, it, expect, vi } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

/**
 * Q1g repro/diagnosis. Found incidentally in Q1f: deleting BT11-040 (Sukamon) after it received
 * a granted "[On Deletion] ..." custom effect appeared to hang `deletePermanent` indefinitely.
 *
 * Root cause: BT11-040 already has its OWN native `OnDeletion` effect (RevealAdd). Once it is
 * also the recipient of a granted `OnDeletion` custom effect, deleting it makes TWO simultaneous
 * same-timing triggered effects fire off the SAME permanent, which correctly raises an
 * `orderTriggers` decision ("Multiple effects triggered. Choose which to resolve first.") per
 * `resolverDecisions.chooseOrder` / `stack.ts`'s `pickNext`. Nothing card- or Sukamon-specific
 * about this: ANY permanent carrying 2+ simultaneous mandatory same-timing effects hits the same
 * decision. It is NOT a cycle in `recomputeContinuousEffects` — that function's own re-entrancy
 * guard (`this.recomputing`) already makes a nested call a no-op, and it is not in play here at
 * all once the watcher has installed.
 *
 * The apparent "hang" is an unanswered decision, not an infinite loop: `GameEngine` always
 * constructs its `DecisionManager` with the real 60-second `DEFAULT_DECISION_TIMEOUT_MS`
 * (`GameEngine.ts`), which auto-resolves a stalled `orderTriggers` decision with a safe default
 * (`{ order: [] }`). `stack.ts`'s `pickNext` already coerces that decline to index 0 when not
 * every simultaneous effect is optional (exactly this case: BT11-040's own RevealAdd is
 * mandatory), so production self-heals in <=60s. Only a hand-rolled test/harness call that
 * forgets to answer the `orderTriggers` decision (no `autoOrderTriggers`, no manual
 * `respondDecision`) sees a promise that never settles within the test process.
 */
describe("Q1g — BT11-040 as a grant recipient (diagnosis, not a bug)", () => {
  function setup() {
    return setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-040", dp: 1000, as: "recipient" }],
          hand: [{ card: "BT11-106", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
  }

  async function installGrantAndDelete(
    s: ReturnType<typeof setup>,
  ): Promise<{ del: Promise<number>; recipient: ReturnType<typeof s.perm> }> {
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

    // Reset to a clean baseline AFTER the play cost was paid, so the memory assertion below
    // isolates the granted effect's own delta from the card's own play cost (BT11-106.test.ts
    // follows the same pattern).
    s.state.memory = 5;

    await engine.recomputeContinuousEffects();

    const del = engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    return { del, recipient };
  }

  it("resolves simultaneous native and granted On Deletion effects without a stale order decision", async () => {
    const s = setup();
    const recipientInstanceId = s.perm("recipient").topCard!.instanceId;
    const { del } = await installGrantAndDelete(s);

    const timeout = new Promise<"TIMED_OUT">((resolve) => setTimeout(() => resolve("TIMED_OUT"), 2000));
    const result = await Promise.race([del.then(() => "DONE" as const), timeout]);

    expect(result).toBe("DONE");
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.trash.some(({ instanceId }) =>
      instanceId === recipientInstanceId
    )).toBe(true);
  }, 10_000);

  it("NOT A HANG IN PRODUCTION: the real 60s DecisionManager timeout resolves it and both effects apply", async () => {
    vi.useFakeTimers();
    try {
      const s = setup();
      const { del, recipient } = await installGrantAndDelete(s);

      // Nobody answers the orderTriggers decision. Fast-forward past DEFAULT_DECISION_TIMEOUT_MS
      // (60_000ms) exactly as a real deployed server's clock would, to prove the decision
      // self-resolves rather than staying open forever.
      await vi.advanceTimersByTimeAsync(60_001);

      const deleted = await del;
      expect(deleted).toBe(1);
      expect(s.state.pendingDecision).toBeUndefined();
      // Both simultaneous effects still ran (RevealAdd trashed/added a card from the reveal, and
      // the granted "[On Deletion] Gain 3 memory." fired) — the safe-default decline is coerced
      // to resolving the mandatory native effect first, not silently dropping either one.
      expect(s.state.memory).toBe(8); // 5 + 3 from the granted GainMemory
      expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === recipient.permanentId)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  }, 15_000);
});
