import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { CardInstance, GameState, Zone, EffectTiming, EffectDuration } from "@aegis/shared";
import { setupEngine, type EngineSetup } from "../testkit/harness.js";
import { buildResolutionEnv, runTiming, type ResolutionDeps } from "./resolution.js";
import { registerCard, unregisterCard } from "./registry.js";
import { UseTracker } from "./kernel.js";
import { unimplementedPrimitives, unimplementedDecisions, type EffectEnvironment } from "./context.js";
import { ContinuousEffectLedger } from "./continuous.js";
import { onPlay, staticModifier } from "./builders.js";
import type { EffectModule } from "./EffectModule.js";
import type { Effect } from "./Effect.js";

/**
 * Integration of the composition root (resolution.ts) with the real framework
 * collection chain (gatherTriggeredEffects) and the real resolver loop (stack.ts).
 * Proves `buildResolutionEnv` wires `collect` -> the framework, shares the
 * UseTracker, and that `runTiming` collects + resolves a registered card's effect.
 *
 * Uses the real card id BT1-001 (it has a card-data definition, so the source builds
 * normally) and installs a stand-in test module for it. BT1-001 also has a real implemented
 * EffectModule, so the stand-in is installed over it in `beforeAll` and the original is
 * restored in `afterAll`: under Vitest's `isolate: false` the registry is shared across
 * files, so the test must not leave its stand-in registered for the next file to read.
 */
const TEST_CARD_ID = "BT1-001";
const TEST_EFFECT_KEY = `${TEST_CARD_ID}/test-on-play`;
const TEST_STATIC_KEY = `${TEST_CARD_ID}/test-static`;

let resolvedCount = 0;
let staticResolvedCount = 0;

const TEST_MODULE: EffectModule = {
  cardId: TEST_CARD_ID,
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: TEST_EFFECT_KEY,
          description: "test on-play",
          // Once-per-turn: with a stable collect() (candidate stays on field), the use
          // ledger filters it after the first resolution so runTiming terminates —
          // exactly how a real once-per-turn trigger drains.
          maxPerTurn: 1,
          resolve: async () => {
            resolvedCount += 1;
          },
        }),
      ];
    }
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: TEST_STATIC_KEY,
        description: "test continuous effect",
        maxPerTurn: 1,
        resolve: async () => {
          staticResolvedCount += 1;
        },
      }),
    ];
  },
};

let priorModule: EffectModule | undefined;

beforeAll(() => {
  priorModule = unregisterCard(TEST_CARD_ID);
  registerCard(TEST_MODULE);
});

afterAll(() => {
  unregisterCard(TEST_CARD_ID);
  if (priorModule !== undefined) registerCard(priorModule);
});

/**
 * Each test lays the test card as the top card of a battle-area permanent: the `onPlay`
 * builder's base guard requires the source to be on the battle area (`isOnBattleArea()`),
 * which is true once the card is a non-breeding permanent's top card — the realistic On
 * Play setup. The Board Spec alias names that permanent; its top card is the effect source.
 */
const topCardOf = (s: EngineSetup, alias: string): CardInstance =>
  s.perm(alias).topCard as CardInstance;

function frameworkEnv(state: GameState): EffectEnvironment {
  return {
    state,
    fx: unimplementedPrimitives(),
    ask: unimplementedDecisions(),
    tracker: new UseTracker(),
    continuous: new ContinuousEffectLedger(),
  };
}

function deps(state: GameState, candidates: CardInstance[], over: () => boolean = () => false): ResolutionDeps {
  return {
    turnSeat: state.turnSeat,
    listCandidateInstances: () => candidates,
    ruleProcess: async () => {},
    isGameOver: over,
    // Single trigger per test -> chooseOrder is never consulted; mandatory effects
    // need no optional prompt.
    chooseOrder: async () => 0,
    askOptional: async () => true,
  };
}

describe("buildResolutionEnv", () => {
  it("collect() delegates to the framework and returns the registered card's triggered effect", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: TEST_CARD_ID, as: "collect" }] } });
    const { state } = s;
    const card = topCardOf(s, "collect");
    const env = buildResolutionEnv(frameworkEnv(state), deps(state, [card]));

    const collected = env.collect(EffectTiming.OnPlay);
    expect(collected.map((c) => c.effect.effectKey)).toContain(TEST_EFFECT_KEY);

    // Nothing at an unrelated timing.
    expect(env.collect(EffectTiming.OnDraw)).toHaveLength(0);
  });

  it("shares the framework UseTracker so resolved uses are visible to canTrigger limits", () => {
    const s = setupEngine({ 0: {} });
    const { state } = s;
    const fenv = frameworkEnv(state);
    const env = buildResolutionEnv(fenv, deps(state, [s.give(0, Zone.Hand, TEST_CARD_ID)]));
    expect(env.tracker).toBe(fenv.tracker);
  });
});

describe("buildResolutionEnv — makeContext link-cost-reduction wiring", () => {
  // BUG (audit finding 10): the triggered-effect resolve() context built
  // createGameAccess() WITHOUT the 3rd linkCostReduction argument, so a Link action
  // inside a TRIGGERED effect's resolve() (e.g. BT24-038's OnPlay Link) always read the
  // context.ts default `() => 0`, ignoring an active <Link +N grant> (BT25-004) even
  // though the same grant is correctly visible during collection (gatherTriggeredEffects).
  it("makeContext's ctx.game.linkCostReduction reads the SAME continuous ledger grant collect() used", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: TEST_CARD_ID, as: "linkcost" }] } });
    const { state } = s;
    const card = topCardOf(s, "linkcost");
    const permanentId = s.perm("linkcost").permanentId;
    const fenv = frameworkEnv(state);
    fenv.continuous.addLinkCostReductionGrant(permanentId, 3, [], EffectDuration.UntilEachTurnEnd);

    const env = buildResolutionEnv(fenv, deps(state, [card]));
    const [collected] = env.collect(EffectTiming.OnPlay);
    expect(collected).toBeDefined();

    const ctx = env.makeContext(collected!);
    expect(ctx.game.linkCostReduction?.(permanentId, [])).toBe(3);
  });
});

describe("runTiming (composition root end-to-end)", () => {
  it("does not consume the per-turn ledger while re-deriving a continuous effect", async () => {
    const before = staticResolvedCount;
    const s = setupEngine({ 0: { battleArea: [{ card: TEST_CARD_ID, as: "static" }] } });
    const { state } = s;
    const card = topCardOf(s, "static");
    const fenv = frameworkEnv(state);

    await runTiming(EffectTiming.None, fenv, deps(state, [card]));

    expect(staticResolvedCount).toBe(before + 1);
    expect(fenv.tracker.count(card.instanceId, TEST_STATIC_KEY)).toBe(0);
  });

  it("collects and resolves a registered OnPlay effect against authoritative state", async () => {
    const before = resolvedCount;
    const s = setupEngine({ 0: { battleArea: [{ card: TEST_CARD_ID, as: "run" }] } });
    const { state } = s;
    const card = topCardOf(s, "run");
    const fenv = frameworkEnv(state);

    await runTiming(EffectTiming.OnPlay, fenv, deps(state, [card]));

    expect(resolvedCount).toBe(before + 1);
    // The use was recorded for maxPerTurn accounting on the shared tracker.
    expect(fenv.tracker.count(card.instanceId, TEST_EFFECT_KEY)).toBe(1);
  });

  it("resolves nothing when no candidate carries an effect at the timing", async () => {
    const before = resolvedCount;
    const s = setupEngine({ 0: { battleArea: [{ card: TEST_CARD_ID, as: "none" }] } });
    const { state } = s;
    const fenv = frameworkEnv(state);

    await runTiming(EffectTiming.OnDraw, fenv, deps(state, [topCardOf(s, "none")]));

    expect(resolvedCount).toBe(before);
  });

  it("does not resolve when the match is already over", async () => {
    const before = resolvedCount;
    const s = setupEngine({ 0: { battleArea: [{ card: TEST_CARD_ID, as: "over" }] } });
    const { state } = s;
    const fenv = frameworkEnv(state);

    await runTiming(EffectTiming.OnPlay, fenv, deps(state, [topCardOf(s, "over")], () => true));

    expect(resolvedCount).toBe(before);
  });
});
