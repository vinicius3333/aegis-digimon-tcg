import { describe, it, expect, afterEach } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine } from "./testkit/harness.js";
import { onPlay } from "./effects/builders.js";
import { registerCard, unregisterCard } from "./effects/registry.js";
import type { EffectModule } from "./effects/EffectModule.js";

// Finding 11 (HIGH): GameEngine.reactivateOnPlay (EX3-065 "activate 1 of that Digimon's
// [On Play] effects") gated the chosen effect only on canActivate, never canTrigger — the
// module function that encodes the effect's declared `when` condition (builders.ts:47
// `canTrigger: (ctx) => baseGuard(ctx) && (extra ? extra(ctx) : true)`). A re-activated
// effect whose `when` no longer holds (e.g. a "when digivolving" one-shot condition, or any
// state-dependent gate) would still resolve as long as its (often unconditional)
// canActivate passed.
//
// This overrides a real, cataloged card's OnPlay module (CardSource construction requires a
// registered CardDefinition — a made-up cardId throws "Unknown cardId") with a synthetic
// effect whose `when` is unconditionally false and whose `canActivate` is unconditionally
// true, so any resolution the gate lets through is directly attributable to the missing
// canTrigger check. Saves and restores whatever module (if any) was previously registered
// under this id in afterEach — vitest.config.ts runs with isolate:false, so the module
// registry is a single shared Map reused across every test file in the worker.
//
// FAILS-WHEN-REVERTED: drop the canTrigger check from reactivateOnPlay and `triggered`
// becomes 1.

const TEST_CARD = "BT1-020"; // Groundramon, Red Lv.5 — a real, cataloged card id

describe("GameEngine.reactivateOnPlay canTrigger gate (finding 11)", () => {
  let triggered = 0;

  const stub: EffectModule = {
    cardId: TEST_CARD,
    effectsForTiming(timing, source) {
      if (timing !== EffectTiming.OnPlay) return [];
      return [
        onPlay({
          source,
          effectKey: `${TEST_CARD}/reactivate-gate-test`,
          description: "test: when() is always false, canActivate() is always true",
          when: () => false,
          canActivate: () => true,
          resolve: async () => {
            triggered += 1;
          },
        }),
      ];
    },
  };

  let original: EffectModule | undefined;

  afterEach(() => {
    unregisterCard(TEST_CARD);
    if (original !== undefined) registerCard(original);
    triggered = 0;
  });

  it("does not resolve a chosen OnPlay effect whose when-gate (canTrigger) is false, even though canActivate is true", async () => {
    original = unregisterCard(TEST_CARD);
    registerCard(stub);
    // No decisions expected in this test (a single OnPlay effect, no chooseOption), so the
    // Test Seam's default (no auto-response opts) requestDecision handler suffices.
    const s = setupEngine({ 0: { battleArea: [{ card: TEST_CARD, dp: 1000, as: "perm" }] } });
    const perm = s.perm("perm");

    await (s.engine as unknown as { reactivateOnPlay(id: string): Promise<void> }).reactivateOnPlay(
      perm.permanentId,
    );

    expect(triggered).toBe(0);
  });
});
