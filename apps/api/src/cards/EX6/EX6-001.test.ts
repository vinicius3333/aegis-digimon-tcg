import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for EX6-001 (Sakuttomon) — Red Lv.2 Digi-Egg.
//
// [Your Turn] [Once Per Turn] [Inherited] When an effect places a card with the
// [Legend-Arms] trait in this Digimon's digivolution cards, gain 1 memory.
// (documented behavior — OnAddDigivolutionCards rule implementation)
//
// No KB entries / no errata.
//
// Implementation: the inherited effect installs an `onAddDigivolutionCards`
// SubTrigger watcher via staticModifier. The watcher checks that the PLACED card has
// the [Legend-Arms] trait and that it's the owner's turn; then it calls gainMemory(1).
//
// FAILS-WHEN-REVERTED: strip the staticModifier / subscribeSubTrigger body from
// EX6-001.ts — the watcher is never installed, so memory does not change when a
// Legend-Arms card is placed.

// BT3-008 (Zubamon) — a Red Lv.3 Digimon with the [Legend-Arms] trait.
const SAKUTTOMON = "EX6-001";
const LEGEND_ARMS = "BT3-008";
const DUMMY = "BT1-009";

/**
 * Call the engine's internal `placeUnder` primitive to simulate an effect
 * placing a loose card instance under a permanent (fires onAddDigivolutionCards).
 * The card must be in a "loose" zone (hand/trash) so placeUnder can remove it.
 */
async function placeUnder(engine: unknown, targetPermanentId: string, instanceIds: string[]): Promise<void> {
  return (engine as {
    primitives: { placeUnder(target: string, ids: string[]): Promise<void> };
  }).primitives.placeUnder(targetPermanentId, instanceIds);
}

async function recompute(engine: unknown): Promise<void> {
  return (engine as {
    recomputeContinuousEffects(): Promise<void>;
  }).recomputeContinuousEffects();
}

describe("EX6-001 Sakuttomon — inherited gain 1 memory when Legend-Arms card placed", () => {
  it("gains 1 memory when a [Legend-Arms] card is placed in its Digimon's digivolution cards (owner turn)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: DUMMY, dp: 3000, as: "host", under: [SAKUTTOMON] }],
        hand: [{ card: LEGEND_ARMS, as: "legendArmsCard" }],
      },
    });
    const p0 = s.state.players[0] as PlayerState;
    s.state.memory = 5;

    // Trigger the continuous recompute so the inherited watcher is installed.
    await recompute(s.engine);

    // Simulate an effect placing the Legend-Arms card under the host Digimon.
    await placeUnder(s.engine, s.perm("host").permanentId, [s.inst("legendArmsCard").instanceId]);

    // Settle the async resolution.
    await settle(() => s.state.memory !== 5, 200);

    // The watcher fired gainMemory(1): memory increases from 5 to 6.
    expect(s.state.memory).toBe(6);
    // The Legend-Arms card is now in the digivolution stack.
    expect(s.perm("host").stack.some((c) => c.instanceId === s.inst("legendArmsCard").instanceId)).toBe(true);
    // It is no longer in hand.
    expect(p0.hand.some((c) => c.instanceId === s.inst("legendArmsCard").instanceId)).toBe(false);
  });

  it("does NOT gain memory when a non-Legend-Arms card is placed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: DUMMY, dp: 3000, as: "host", under: [SAKUTTOMON] }],
        hand: [{ card: DUMMY, as: "nonLegendArms" }],
      },
    });
    s.state.memory = 5;
    await recompute(s.engine);

    await placeUnder(s.engine, s.perm("host").permanentId, [s.inst("nonLegendArms").instanceId]);
    for (let i = 0; i < 50; i++) await Promise.resolve();

    // No gain: the matches predicate (Legend-Arms trait check) returned false.
    expect(s.state.memory).toBe(5);
  });
});
// NOTE: The [Once Per Turn] gate is a known engine residual. The documented behavior HashString
// mechanism (SetHashString("Gain1Memory_EX6_001")) is tracked via UseEffectsThisTurn
// which maps to Aegis UseTracker. However, the subTrigger subscription's run/matches
// body does not have tracker access, and fireSubTrigger calls recomputeContinuousEffects
// after each fire, which reinstalls the subscription with a fresh closure (resetting
// any closure-captured `firedThisInstall` flag). The once-per-turn gate cannot be
// enforced without engine support for passing UseTracker into subTrigger bodies.
// Residual: EX6-001/legend-arms-digi-add-gain-memory: once-per-turn gate unenforceable.
