import { EffectTiming, type CardInstance, type Seat } from "@aegis/shared";
import {
  createEffectContext,
  createGameAccess,
  gatherTriggeredEffects,
  type EffectEnvironment,
} from "./context.js";
import type { CollectedEffect } from "./collect.js";
import type { EffectContext } from "./EffectContext.js";
import { resolveTiming, type ResolutionEnv } from "./stack.js";

/**
 * Composition root for the effect stack (subsystem: effect-stack-resolution): bind
 * the pure resolver loop in stack.ts to the effect-framework's collection chain
 * (`gatherTriggeredEffects`, context.ts) and the engine's authoritative state, then
 * run a timing window.
 *
 * This is the single seam `GameEngine.fireTiming` delegates to via `runTiming`. — not inside the pure loop and not
 * inside the engine — lets the resolver stay unit-testable with fakes while the
 * engine wires production dependencies in one call.
 *
 * The source `GetSkillInfos` (documented behavior) walks a fixed set of zones for
 * candidate effects: each player's field permanents, hand, trash, and face-up
 * security, for BOTH players (turn order applied later). The engine supplies that
 * candidate list via `listCandidateInstances` so this module does not encode
 * GameState's zone layout; the framework's `gatherTriggeredEffects` applies the
 * kernel `canTrigger` + per-turn-limit filter.
 */

/** The engine-side dependencies the resolver composition needs beyond the framework env. */
export interface ResolutionDeps {
  /** Active player (turn-player-first ordering). Usually `state.turnSeat`. */
  turnSeat: Seat;

  /**
   * The card instances that could contribute an effect at a timing — the union of
   * the zones documented behavior `GetSkillInfos` scans (field permanents + hand +
   * trash + face-up security, both players). Re-invoked on every collection pass so
   * effects on cards that entered a zone DURING resolution are seen. The canonical
   * implementation (`GameEngine.listCandidateInstances` /
   * `collectPermanentInstances`) also surfaces each permanent's digivolution-stack
   * and linked cards.
   */
  listCandidateInstances: () => readonly CardInstance[];

  /**
   * State-based-action sweep run after each resolution (documented behavior
   * `RuleProcess`). Owned by delayed-and-rule-effects / security-and-win-check; the
   * resolver only needs the seam. A no-op is acceptable until those land.
   */
  ruleProcess: () => Promise<void>;

  /** Has the match ended? (`state.gameOver`). */
  isGameOver: () => boolean;

  /** Controller prompts the resolver issues between effects (createResolverDecisions). */
  chooseOrder: ResolutionEnv["chooseOrder"];
  askOptional: ResolutionEnv["askOptional"];

  /** Observability seam: a triggered effect finished resolving (see ResolutionEnv.onResolved). */
  onResolved?: ResolutionEnv["onResolved"];
}

/**
 * Assemble a {@link ResolutionEnv} from the framework {@link EffectEnvironment}
 * (state + fx + ask + tracker) and the engine {@link ResolutionDeps}. `collect`
 * delegates straight to `gatherTriggeredEffects` with a FRESHLY listed candidate
 * set each pass; `makeContext` reuses the framework's EffectContext factory bound to
 * the same state/fx/ask the env carries.
 */
export function buildResolutionEnv(env: EffectEnvironment, deps: ResolutionDeps): ResolutionEnv {
  // An ability acquired while this timing window is already resolving did not exist when the
  // triggering event occurred and therefore cannot trigger retroactively (BT10-011 Q1940).
  // Nested events build their own ResolutionEnv and see grants that existed before *their* event.
  const grantSnapshot = {
    stackEffectConferrals: [...env.continuous.listStackEffectConferrals()],
    customEffectGrants: [...env.continuous.listCustomEffectGrants()],
  };
  return {
    turnSeat: deps.turnSeat,
    tracker: env.tracker,
    collect: (timing: EffectTiming): CollectedEffect[] =>
      gatherTriggeredEffects(env, timing, deps.listCandidateInstances(), grantSnapshot),
    makeContext: (collected: CollectedEffect): EffectContext =>
      createEffectContext({
        source: collected.source,
        // Carry the firing window's TriggerInfo into the resolution context (was hardcoded
        // `{}`), so a triggered effect's resolve() can read the trigger source — e.g. "that
        // attacking Digimon" (P-064 attackerPermanentId) or "the Digimon that digivolved"
        // (BT19-080 subjectPermanentId). Collection (context.ts:309) already binds env.triggerInfo
        // for the canTrigger/`when` check; resolution must use the SAME trigger or a deferred
        // resolve (after an optional/cost decision) loses the source.
        trigger: env.triggerInfo ?? {},
        // Third arg (linkCostReduction) mirrors gatherTriggeredEffects (context.ts:303-307)
        // and GameEngine.buildEffectContext: without it, a Link action resolved from a
        // TRIGGERED effect (e.g. BT24-038's OnPlay Link) reads the () => 0 default inside
        // createGameAccess and ignores any active <Link +N> cost-reduction grant (BT25-004).
        game: createGameAccess(
          env.state,
          (id) => env.continuous.linkMaxDelta(id),
          (id, traits) => env.continuous.linkCostReduction(id, traits),
          env.hasKeyword,
          env.digivolvedThisTurn,
          undefined,
          env.effectiveColors,
          env.colorRequirementWaived,
        ),
        fx: env.fx,
        ask: env.ask,
        usage: env.tracker,
        activeTiming: collected.timing === undefined ? undefined : EffectTiming[collected.timing],
        activeEffectText: collected.effect.description,
        conferredToPermanentId: collected.conferredToPermanentId,
      }),
    ruleProcess: deps.ruleProcess,
    isGameOver: deps.isGameOver,
    chooseOrder: deps.chooseOrder,
    askOptional: deps.askOptional,
    onResolved: deps.onResolved,
  };
}

/**
 * Build the env and resolve a timing window in one call — the exact body
 * `GameEngine.fireTiming` should adopt once it constructs an EffectEnvironment
 * (state + createPrimitives + createDecisionApi + a per-turn UseTracker) and a
 * ResolutionDeps (createResolverDecisions + candidate-zone enumeration + the rule
 * sweep). Until then `fireTiming` stays a documented no-op.
 */
export async function runTiming(
  timing: EffectTiming,
  env: EffectEnvironment,
  deps: ResolutionDeps,
): Promise<void> {
  await resolveTiming(timing, buildResolutionEnv(env, deps));
}
