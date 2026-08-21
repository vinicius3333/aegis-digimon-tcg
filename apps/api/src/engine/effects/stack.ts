import { EffectTiming } from "@aegis/shared";
import type { Seat } from "@aegis/shared";
import type { EffectContext } from "./EffectContext.js";
import type { CollectedEffect } from "./collect.js";
import { UseTracker, canActivate } from "./kernel.js";

/** One effect paired with the source that produced it (collection output). */
export type { CollectedEffect } from "./collect.js";

/**
 * Hard cap on resolution passes for one timing window (one pass == one effect
 * resolved or one all-optional group declined). Far above any real chain depth; it
 * exists only to convert a buggy never-terminating effect into a thrown error
 * instead of a hung match.
 */
export const MAX_RESOLUTION_PASSES = 1000;

/**
 * Order collected effects so the turn player's effects resolve before the
 * opponent's (rulebook: simultaneous triggers resolve turn-player-first). Stable
 * within each side, so same-side ordering is preserved until the controller is
 * asked to reorder their own. Mirrors `ActivateMultipleSkills` splitting the
 * triggered list into `TurnPlayerSkillInfos` then `NonTurnPlayerSkillInfos` and
 * resolving the turn player's bucket first.
 */
export function orderTurnPlayerFirst(collected: readonly CollectedEffect[], turnSeat: Seat): CollectedEffect[] {
  const mine: CollectedEffect[] = [];
  const theirs: CollectedEffect[] = [];
  for (const item of collected) {
    if (item.source.ownerSeat === turnSeat) mine.push(item);
    else theirs.push(item);
  }
  return [...mine, ...theirs];
}

/**
 * The environment the resolver runs against. It is deliberately decoupled from the
 * concrete engine so the loop is pure and unit-testable: the engine supplies these
 * functions (bound to authoritative GameState via the effect-framework's
 * `gatherTriggeredEffects` + `createEffectContext`), and tests supply fakes.
 */
export interface ResolutionEnv {
  /** The active player; used for turn-player-first ordering. */
  readonly turnSeat: Seat;
  /** Per-turn use ledger (maxPerTurn accounting). Engine-owned; reset each turn. */
  readonly tracker: UseTracker;

  /**
   * Collect the effects that TRIGGER at `timing` right now (kernel `canTrigger`
   * already applied), each paired with its source. The framework half
   * (`gatherTriggeredEffects`). Re-invoked after every resolution to pick up
   * effects newly triggered during resolution.
   */
  collect(timing: EffectTiming): CollectedEffect[];

  /** Bind the runtime EffectContext for a collected effect (trigger data + game + fx + ask). */
  makeContext(collected: CollectedEffect): EffectContext;

  /**
   * State-based-action sweep run after each resolution (and once up front). The TS
   * analogue of documented behavior `RuleProcess` (trash DP-0 Digimon, discard
   * non-Digimon from breeding, link-condition checks, loss resolution, ...). The
   * deep rule set is owned by other subsystems; the resolver only needs the seam so
   * ordering and re-scan match the source. Returns when state is quiet.
   */
  ruleProcess(): Promise<void>;

  /** Has the match ended? When true the resolver stops immediately (source `endGame` guard). */
  isGameOver(): boolean;

  /**
   * Resolve the match to a draw and stop. Comprehensive Rules §18-3-2: "If an infinite
   * loop occurs and neither player has the ability to stop it, that game ends in a
   * draw." Called instead of throwing when the pass cap below is exceeded, wired to
   * `WinCheck.declareDraw`. Optional so a `ResolutionEnv` that doesn't supply it (e.g.
   * an older/test caller) keeps today's throw-on-overflow behavior — still a real
   * safety net against a genuinely buggy card effect, just not the rules-correct
   * terminal outcome.
   */
  declareDraw?(): Promise<void>;

  /**
   * Ask the controller which simultaneously-activatable effect to resolve next,
   * returning its index into `active`. Called only when multiple effects share the
   * controller's activation window; a lone effect has no ordering decision. Return
   * `null` to decline resolving the remaining effects — only honored when every
   * remaining effect is optional (source
   * `CanNoSelect = active.All(s => s.CardEffect.IsSkippable(...))`).
   */
  chooseOrder(seat: Seat, active: readonly CollectedEffect[], timing: EffectTiming): Promise<number | null>;

  /**
   * Ask the controller whether to use an optional effect (source
   * `Activate_Optional` -> `OptionalSkill.SelectOptional`). Called only for effects
   * whose `optional` flag is set. Returns true to resolve it, false to skip.
   */
  askOptional(seat: Seat, collected: CollectedEffect): Promise<boolean>;

  /**
   * Notify that a triggered effect finished resolving (body ran; declined optionals do
   * NOT fire this). Optional observability seam used by the engine to surface a
   * transient "what just resolved" overlay; the pure resolver never depends on it.
   */
  onResolved?(timing: EffectTiming, collected: CollectedEffect): void;
}

/**
 * Resolve every effect that fires at `timing`, including effects that trigger during
 * resolution.
 *
 * Faithful port of `the engine.TriggeredSkillProcess` ->
 * `MultipleSkills.ActivateMultipleSkills`: collect the triggered effects, resolve
 * the turn player's before the opponent's, and after EACH single resolution run the
 * rule sweep and RE-COLLECT across both players (the source `TriggeredSkillProcess`
 * re-entry) so effects triggered during resolution — either player's — are folded in
 * and still ordered turn-player-first.
 *
 * Implemented as one fixpoint loop rather than two sequential buckets precisely so a
 * cross-player re-trigger (e.g. the turn player's effect triggers an opponent's) is
 * not missed: every pass re-derives the full activatable set, re-orders it, and
 * resolves the frontmost effect.
 */
export async function resolveTiming(timing: EffectTiming, env: ResolutionEnv): Promise<void> {
  // Up-front rule sweep mirrors AutoProcessCheck running RuleProcess before
  // TriggeredSkillProcess.
  await env.ruleProcess();
  if (env.isGameOver()) return;

  // Optionals the controller has declined THIS window. We re-collect every pass, so
  // without this a declined optional would be re-collected and re-offered forever.
  // Identity matches the use ledger: (instanceId, effectKey). Cleared only when this
  // timing window finishes (the source removes a declined optional from the bucket
  // for the duration of the resolution).
  const declined = new Set<string>();
  const declineKey = (c: CollectedEffect): string => `${c.source.instanceId} ${c.effect.effectKey}`;

  // Effects already RESOLVED this window. A triggered effect activates once per
  // trigger (Comprehensive Rules §15-4-4-2) — the source `StackSkillInfos` removes
  // a resolved skill from the pending-activation list. Because we re-collect every
  // pass to fold in effects triggered DURING resolution, an UNLIMITED mandatory
  // effect (maxPerTurn = -1, the common case) would otherwise re-trigger forever (its
  // standing canTrigger/canActivate guard never clears and there is no use limit to
  // stop it). Tracking resolved (instanceId, effectKey) here drops each one out after
  // it resolves, exactly as the source does, while still admitting genuinely
  // newly-triggered effects (a distinct instance/effectKey not yet resolved).
  const resolved = new Set<string>();
  // The currently executing effect remains collectable until its body returns and
  // is registered as resolved. A re-entrant drain must exclude it while still
  // allowing every other pending effect in this same window to proceed.
  const inProgress = new Set<string>();

  // Effects seen as ACTIVE (activatable) in some earlier pass this window. Used to spot
  // derived triggering (Comprehensive Rules §15-4-5-2/3): "a derived triggering effect
  // will activate before previously triggered effects that are pending activation ... if
  // a derived triggering effect occurs for the non-turn player when there are pending
  // activation effects for the turn player, the derived triggering effect will activate
  // first." A key not in this set on the pass it first becomes active is a fresh/derived
  // trigger and is ordered ahead of every already-pending (previously-seen) effect,
  // regardless of seat; turn-player-first ordering is still applied WITHIN each of those
  // two groups. On the very first pass nothing has been seen yet, so every effect is
  // "derived" together and this collapses to plain orderTurnPlayerFirst (no behavior
  // change for the common single-pass case).
  const everActive = new Set<string>();

  // Effects seen in SOME earlier collection pass this window (before the canActivate filter),
  // and the subset of those that have since stopped being collected at all.
  //
  // Comprehensive Rules §15-4-4-3: "When a card with an effect that's pending activation becomes
  // a new card before the effect activates, the effect can no longer be activated" — a card that
  // leaves its area is a new card when it comes back. §15-4-4-5 says the same for an effect whose
  // trigger conditions stop being met before it activates. Both show up here identically: the
  // effect drops out of `collect(timing)`, which re-queries live state every pass. Without a
  // record of the departure, a card that leaves and returns inside one window — or a condition
  // that flickers off and back on — silently revives its pending trigger, because the fixpoint
  // re-derives the activatable set purely from the current board.
  //
  // `inProgress` is excluded: the effect currently executing routinely removes its own source
  // (a "by trashing this card" cost) and must not mark itself departed mid-body — it is dropped
  // by `resolved` when it finishes instead.
  const everCollected = new Set<string>();
  const departed = new Set<string>();

  // Defensive bound. The source loop relies entirely on canActivate / maxPerTurn /
  // declines to terminate; a mis-implemented card with an unlimited, always-activatable
  // mandatory effect would otherwise spin forever and hang the match. Throwing (vs
  // silently stopping) surfaces the bug as a turn-loop error the engine reports.
  let passes = 0;

  const drainCurrentTimingWindow = async (): Promise<void> => {
    while (true) {
      if (++passes > MAX_RESOLUTION_PASSES) {
        if (env.declareDraw !== undefined) {
          await env.declareDraw();
          return;
        }
        throw new Error(
          `resolveTiming(${String(timing)}): exceeded ${MAX_RESOLUTION_PASSES} resolution passes — ` +
            "likely a card effect that never clears its trigger/activation guard.",
        );
      }
      if (env.isGameOver()) return;

      // Re-collect every pass: this is the TriggeredSkillProcess re-entry.
      const collectedThisPass = env.collect(timing);

      // Retire anything that was collectable earlier this window and is not any more (§15-4-4-3
      // / §15-4-4-5, see `departed` above). Recorded before the activatable filter so a card
      // that leaves and returns cannot come back with its pending trigger intact.
      const presentKeys = new Set(collectedThisPass.map(declineKey));
      for (const key of everCollected) {
        if (!presentKeys.has(key) && !inProgress.has(key)) departed.add(key);
      }
      for (const key of presentKeys) everCollected.add(key);

      const active = collectedThisPass.filter(
        (c) =>
          !declined.has(declineKey(c)) &&
          !resolved.has(declineKey(c)) &&
          !inProgress.has(declineKey(c)) &&
          !departed.has(declineKey(c)) &&
          canActivate(c.effect, env.makeContext(c), env.tracker),
      );
      if (active.length === 0) return;

      // Split into freshly-active (derived this pass) vs already-pending (seen active in
      // an earlier pass), per §15-4-5-3 above. Both groups keep turn-player-first order
      // internally; the derived group goes first as a whole.
      const derived: CollectedEffect[] = [];
      const pending: CollectedEffect[] = [];
      for (const c of active) (everActive.has(declineKey(c)) ? pending : derived).push(c);
      for (const c of active) everActive.add(declineKey(c));
      const ordered = [...orderTurnPlayerFirst(derived, env.turnSeat), ...orderTurnPlayerFirst(pending, env.turnSeat)];

      // The frontmost contiguous group sharing the frontmost controller is the set of
      // that player's simultaneous triggers they may order among (rulebook: the turn
      // player orders all their own simultaneous triggers first, then the opponent
      // theirs). Cross-player ordering is fixed by orderTurnPlayerFirst, so we only ever
      // prompt within one controller's group.
      const frontSeat = ordered[0]!.source.ownerSeat;
      const group = ordered.filter((c) => c.source.ownerSeat === frontSeat);

      const choice = await pickNext(frontSeat, group, timing, env);
      if (choice === null) {
        // Decline is only returned when every effect in the group is optional. Mark them
        // declined so the loop can progress to the other player's effects (or finish).
        for (const c of group) declined.add(declineKey(c));
        continue;
      }

      const chosen = group[choice];
      if (chosen === undefined) return; // defensive: out-of-range index

      const chosenKey = declineKey(chosen);
      inProgress.add(chosenKey);
      let wasResolved: boolean;
      try {
        wasResolved = await resolveOne(chosen, env, timing, () => declined.add(chosenKey), drainCurrentTimingWindow);
      } finally {
        inProgress.delete(chosenKey);
      }
      // A resolved (non-declined) triggered effect leaves the pending list for this
      // window so the next re-collection does not re-offer it (single-trigger rule).
      if (wasResolved) {
        resolved.add(declineKey(chosen));
        env.onResolved?.(timing, chosen);
      }

      // State-based actions between effects (RuleProcess). The next loop iteration
      // re-collects, surfacing anything triggered during this resolution.
      await env.ruleProcess();
    }
  };

  await drainCurrentTimingWindow();
}

/**
 * Choose the next effect to resolve from a single controller's simultaneously-
 * activatable group.
 *  - Exactly one: proceed directly; an optional effect still gets its existing
 *    accept/decline decision in `resolveOne`, while a mandatory effect resolves.
 *  - More than one: ask the controller (`chooseOrder`). A `null` (decline) is only
 *    valid when every effect in the group is optional; otherwise the controller MUST
 *    pick one, so a `null` is coerced to index 0 to keep mandatory triggers from
 *    being silently dropped.
 */
async function pickNext(
  seat: Seat,
  group: readonly CollectedEffect[],
  timing: EffectTiming,
  env: ResolutionEnv,
): Promise<number | null> {
  if (group.length === 1) return 0;

  const allOptional = group.every((c) => c.effect.optional);
  const picked = await env.chooseOrder(seat, group, timing);

  if (picked === null) return allOptional ? null : 0;
  if (picked < 0 || picked >= group.length) return allOptional ? null : 0;
  return picked;
}

/**
 * Resolve a single effect: ask the optional question when needed, run the body, and
 * record the use for maxPerTurn accounting.
 *
 * Mirrors `Activate_Optional_Effect_Execute`: an optional effect first asks the
 * controller; if declined the body is skipped and NO use is recorded (source only
 * registers the use inside `OnProcessCallbuck`, invoked from `Activate_Execute`,
 * which runs only when `UseOptional || !IsOptional`). The kernel `canActivate` gate
 * was already checked by the caller, matching the `cardEffect.CanActivate(hashtable)`
 * re-check inside the source `Activate(...)` local function.
 */
async function resolveOne(
  collected: CollectedEffect,
  env: ResolutionEnv,
  timing: EffectTiming,
  onDeclined: () => void,
  drainCurrentTimingWindow: () => Promise<void>,
): Promise<boolean> {
  const { source, effect } = collected;
  const ctx = env.makeContext(collected);
  ctx.drainCurrentTimingWindow = drainCurrentTimingWindow;

  if (effect.optional) {
    const use = await env.askOptional(source.ownerSeat, collected);
    if (!use) {
      // A declined optional must not be re-collected and re-offered this window
      // (source removes it from the bucket). No use is recorded.
      onDeclined();
      return false;
    }
  }

  ctx.fx.enterEffectResolution?.(source.ownerSeat, [...source.definition.kinds]);
  try {
    await effect.resolve(ctx);
  } finally {
    ctx.fx.leaveEffectResolution?.();
  }

  // source RegisterUseEffectThisTurn(cardEffect): identity is (instanceId, effectKey).
  if (timing !== EffectTiming.None) env.tracker.register(source.instanceId, effect.effectKey);
  return true;
}
