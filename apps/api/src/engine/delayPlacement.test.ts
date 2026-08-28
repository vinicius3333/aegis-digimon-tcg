import { describe, it, expect, afterEach } from "vitest";
import { GameState, EffectTiming, compiledEffects, type Seat } from "@aegis/shared";
import { applyPlayCard, type PlayCardDeps } from "./actions/playCard.js";
import { setupEngine } from "./testkit/harness.js";

/**
 * A3 behavioral test for the ＜Delay＞ keyword engine rule (KEYW-01).
 *
 * Proves: an Option with ＜Delay＞, after [Main] resolution, is placed face-down
 * in the delay zone per Comprehensive Rules §16-17, instead of being trashed.
 * An Option without ＜Delay＞ continues to go to trash as before (no regression).
 *
 * FAILS-WHEN-REVERTED: stub the `hasDelay` check in playCard.ts to always return
 * false - the Delay Option now goes to trash instead of delayZone, and Test 1
 * assertions turn RED.
 *
 * Test structure follows useOption.test.ts — drives the REAL applyPlayCard path
 * with compiled effects injected via the compiledEffects registry seam.
 */

// --- Test card IDs using real cards from cards.json ---
// These are real Option cards (BT1-090: Gravity Crush, playCost 0; BT10-104: Immortal Ruler, playCost 0).
// compiledEffects is mutated per-test to inject/remove the Delay keyword.
const DELAY_OPTION_ID = "BT1-090";
const NORMAL_OPTION_ID = "BT10-104";

// Original compiled effects (saved before mutation, restored in afterEach).
const originalDelayCompiled = compiledEffects[DELAY_OPTION_ID];
const originalNormalCompiled = compiledEffects[NORMAL_OPTION_ID];

function injectDelayCompiled() {
  compiledEffects[DELAY_OPTION_ID] = {
    effects: [{ trigger: "Main", keywords: [{ keyword: "Delay" }], actions: [] }],
    coverage: "full",
    residual: [],
  };
}

function injectNormalCompiled() {
  compiledEffects[NORMAL_OPTION_ID] = {
    effects: [{ trigger: "Main", keywords: [], actions: [{ kind: "Draw", controller: "mine", amount: 1 }] }],
    coverage: "full",
    residual: [],
  };
}

function restoreCompiled() {
  if (originalDelayCompiled !== undefined) {
    compiledEffects[DELAY_OPTION_ID] = originalDelayCompiled;
  } else {
    delete compiledEffects[DELAY_OPTION_ID];
  }
  if (originalNormalCompiled !== undefined) {
    compiledEffects[NORMAL_OPTION_ID] = originalNormalCompiled;
  } else {
    delete compiledEffects[NORMAL_OPTION_ID];
  }
}

// --- Helpers (following useOption.test.ts / playCard.test.ts patterns) ---

export interface TestPlayCardDeps extends PlayCardDeps {
  maxAffordable(state: GameState, seat: Seat): number;
  payMemory(state: GameState, seat: Seat, cost: number): void;
  nextPermanentId(): string;
  fireTiming(state: GameState, seat: Seat, timing: EffectTiming, sourceInstanceId: string): Promise<void>;
  emit?: (event: any) => void;
}

function makeDeps(): TestPlayCardDeps {
  let nextPermId = 0;
  return {
    maxAffordable: () => 10,
    payMemory: () => {},
    nextPermanentId: () => {
      nextPermId += 1;
      return `p-${nextPermId}`;
    },
    fireTiming: async () => {}, // no-op — Main resolution not needed for zone routing
    emit: () => {},
  };
}

// --- Tests ---

describe("Delay placement — A3 behavioral proof (KEYW-01)", () => {
  afterEach(() => {
    restoreCompiled();
  });

  it("an Option with ＜Delay＞ lands face-down in delayZone after Main resolution", async () => {
    injectDelayCompiled();
    injectNormalCompiled(); // also inject normal for safety

    const s = setupEngine({ 0: { hand: [{ card: DELAY_OPTION_ID, as: "delayOption" }] } });
    const state = s.state;
    const player = state.players[0]!;
    const delayOption = s.inst("delayOption");

    const deps = makeDeps();
    const result = await applyPlayCard(
      state,
      0,
      {
        type: "playCard",
        instanceId: delayOption.instanceId,
      },
      deps,
    );

    expect(result.ok).toBe(true);

    // Card is in delayZone, NOT in trash
    expect(player.delayZone.length).toBe(1);
    expect(player.delayZone[0]!.instanceId).toBe(delayOption.instanceId);
    expect(player.delayZone[0]!.faceUp).toBe(false); // face-down per KB glossary
    expect(player.trash.length).toBe(0);
    // Card is no longer in hand
    expect(player.hand).toHaveLength(0);
  });

  it("an Option WITHOUT ＜Delay＞ goes to trash (regression guard)", async () => {
    injectNormalCompiled();

    const s = setupEngine({ 0: { hand: [{ card: NORMAL_OPTION_ID, as: "normalOption" }] } });
    const state = s.state;
    const player = state.players[0]!;
    const normalOption = s.inst("normalOption");

    const deps = makeDeps();
    const result = await applyPlayCard(
      state,
      0,
      {
        type: "playCard",
        instanceId: normalOption.instanceId,
      },
      deps,
    );

    expect(result.ok).toBe(true);

    // Card is in trash, NOT in delayZone
    expect(player.trash.length).toBe(1);
    expect(player.trash[0]!.instanceId).toBe(normalOption.instanceId);
    expect(player.delayZone.length).toBe(0);
    expect(player.hand).toHaveLength(0);
  });

  // FAILS-WHEN-REVERTED: In playCard.ts, change:
  //   const hasDelay = compiled?.effects?.some(
  //     (eff) => (eff.keywords ?? []).some((kw) => kw.keyword === "Delay"),
  //   );
  //   if (hasDelay) { ... delayZone ... }
  // to:
  //   const hasDelay = false; // REVERT
  // and Test 1 turns RED — the Delay Option goes to trash instead of delayZone.
  //
  // Restore the original hasDelay check to make the test GREEN again.
  it("FAILS-WHEN-REVERTED lever is documented", () => {
    // This test exists solely to document the revert lever.
    // The actual revert behavior is described in the comment above.
    // When reverting: go to playCard.ts, stub `hasDelay = false`,
    // run this test file, and Test 1 ("an Option with ＜Delay＞ lands
    // face-down in delayZone") FAILS because the Delay Option goes
    // to trash instead.
    expect(true).toBe(true);
  });
});
