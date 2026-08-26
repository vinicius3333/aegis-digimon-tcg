import type { Permanent, Seat } from "@aegis/shared";
import type { EffectContext, RemovalCause } from "./EffectContext.js";
import type { ReplacementSubscription, SubTriggerRegistry } from "./subtriggers.js";

function replacementActivationKey(replacement: ReplacementSubscription): string {
  const source = replacement.sourceInstanceId ?? replacement.sourcePermanentId ?? "unanchored";
  const action = replacement.activationIdentity ?? `subscription-${replacement.id}`;
  return `${source}:${action}`;
}

/**
 * The narrow seam the leave-prevention consult needs from its host engine
 * (subsystem: delayed-and-rule-effects). Kept tiny so the consult can be unit-tested
 * against a fake without standing up a whole GameEngine.
 */
export interface LeavePreventionHost {
  subTriggers: SubTriggerRegistry;
  /** The live permanent for an id (undefined when it already left). */
  permanentById(permanentId: string): Permanent | undefined;
  /** Build the reaction's EffectContext for a source permanent (with the leaving id in trigger). */
  buildContext(sourcePermanent: Permanent, leavingPermanentId: string): EffectContext;
  buildInstanceContext?(sourceInstanceId: string, leavingPermanentId: string): EffectContext | undefined;
  /** The active turn seat — the default resolving controller for an effect-driven removal. */
  turnSeat: Seat;
  /** Whether a once-per-turn prevention key has already fired this turn (resets each turn). */
  oncePerTurnFired?(key: string): boolean;
  /** Record that a once-per-turn prevention key fired this turn. */
  markOncePerTurnFired?(key: string): void;
}

/**
 * Consult active "prevent"/"instead" leave/delete replacements for the permanents about to be
 * removed (the D_leave_area_prevent family). For each leaving permanent:
 *
 * - "instead" reactions (＜Decode＞, BT20-091's "you may play 1 [Omekamon]") run FIRST and
 *   unconditionally: they gate on `causeAllows` + `appliesTo` (+ `oncePerTurnKey`) and run
 *   `apply` as a side effect, but never add to the returned set — per Comprehensive Rules
 *   §16-36, the leave still happens. Every applicable "instead" reaction fires (no early exit).
 * - "prevent" reactions then run in order: each must (a) allow the removal CAUSE (a "by an
 *   opponent's effect" reaction must not fire on the controller's own deletion; "other than by
 *   battle" must not fire on combat), (b) PROTECT that permanent (self-reaction => only its own
 *   source; a filtered reaction => any matching permanent), and (c) successfully run its
 *   preventCheck (prompt + pay the all-or-nothing cost). The first successful one per leaving
 *   permanent wins and stops the search for that permanent.
 *
 * Returns the subset whose removal was prevented (by a "prevent" reaction only).
 *
 * `affectsAll` reactions ("they don't leave") pay once and then save every matching permanent
 * in the same consult; `affectsAll:false` ("1 of those doesn't leave") pays per saved
 * permanent. The shared `reentryGuard` suppresses only the replacement already resolving, so a
 * prevention cost that deletes another protected permanent may activate that other permanent's
 * distinct immediate effect while the original cannot recursively reactivate (BT11-040 Q2074).
 */
export async function consultLeavePrevention(
  host: LeavePreventionHost,
  permanentIds: string[],
  cause: RemovalCause,
  resolvingSeat: Seat | undefined,
  opts: { isBounce?: boolean; reentryGuard: { activeReplacementKeys: Set<string> } },
): Promise<Set<string>> {
  const prevented = new Set<string>();
  // wouldLeavePlay covers any leave (delete + hand/deck bounce); wouldBeDeleted watches
  // deletion ONLY — a bounce must NOT trigger a deletion-only reaction (BT9-044, RB1-016).
  // replacementsFor already excludes "reduceCost" (unrelated to leave/delete), leaving the
  // "prevent" and "instead" modes this consult handles.
  const replacements = [
    ...(opts.isBounce === true ? [] : host.subTriggers.replacementsFor("wouldBeDeleted")),
    ...host.subTriggers.replacementsFor("wouldLeavePlay"),
  ];
  if (replacements.length === 0) return prevented;
  const seat = resolvingSeat ?? (cause === "byEffect" ? host.turnSeat : undefined);
  const firedAll = new Set<number>(); // affectsAll replacements that already paid this consult
  for (const leavingId of permanentIds) {
    if (prevented.has(leavingId)) continue;
    if (host.permanentById(leavingId) === undefined) continue;
    // "instead" pass: substitute side effects that do NOT gate the removal itself.
    for (const repl of replacements) {
      if (repl.mode !== "instead") continue;
      const activationKey = replacementActivationKey(repl);
      if (opts.reentryGuard.activeReplacementKeys.has(activationKey)) continue;
      if (repl.sourcePermanentId === undefined && repl.sourceInstanceId === undefined) continue;
      if (repl.causeAllows && !repl.causeAllows(cause, seat, opts.isBounce === true)) continue;
      const srcPerm = repl.sourcePermanentId === undefined ? undefined : host.permanentById(repl.sourcePermanentId);
      if (srcPerm === undefined && repl.sourceInstanceId === undefined) continue;
      if (srcPerm !== undefined && srcPerm.topCard === undefined) continue;
      if (repl.oncePerTurnKey !== undefined && host.oncePerTurnFired?.(repl.oncePerTurnKey)) continue;
      const ctx =
        srcPerm !== undefined
          ? host.buildContext(srcPerm, leavingId)
          : host.buildInstanceContext?.(repl.sourceInstanceId!, leavingId);
      if (ctx === undefined) continue;
      if (repl.appliesTo && !repl.appliesTo(ctx, leavingId)) continue;
      opts.reentryGuard.activeReplacementKeys.add(activationKey);
      try {
        await repl.apply(ctx);
      } finally {
        opts.reentryGuard.activeReplacementKeys.delete(activationKey);
      }
      // A true relocation replacement (BT22-007) removes the would-leave permanent from
      // the battle area as its payload. Do not let the original removal continue against
      // the now-relocated cards. Side-effect-only "instead" reactions such as Decode leave
      // the permanent live here and therefore keep their established fall-through behavior.
      if (host.permanentById(leavingId) === undefined) prevented.add(leavingId);
      if (repl.oncePerTurnKey !== undefined) host.markOncePerTurnFired?.(repl.oncePerTurnKey);
    }
    // "prevent" pass: the first successful reaction wins and stops the search.
    for (const repl of replacements) {
      if (repl.mode !== "prevent") continue;
      const activationKey = replacementActivationKey(repl);
      if (opts.reentryGuard.activeReplacementKeys.has(activationKey)) continue;
      if (repl.sourcePermanentId === undefined && repl.sourceInstanceId === undefined) continue;
      if (repl.causeAllows && !repl.causeAllows(cause, seat, opts.isBounce === true)) continue;
      const srcPerm = repl.sourcePermanentId === undefined ? undefined : host.permanentById(repl.sourcePermanentId);
      if (srcPerm === undefined && repl.sourceInstanceId === undefined) continue;
      if (srcPerm !== undefined && srcPerm.topCard === undefined) continue;
      const ctx =
        srcPerm !== undefined
          ? host.buildContext(srcPerm, leavingId)
          : host.buildInstanceContext?.(repl.sourceInstanceId!, leavingId);
      if (ctx === undefined) continue;
      if (repl.protects && !repl.protects(ctx, leavingId)) continue;
      if (repl.affectsAll && firedAll.has(repl.id)) {
        prevented.add(leavingId); // one activation already prevented all matching
        break;
      }
      // Once-per-turn cap (＜Barrier＞): a reaction that already prevented a removal this turn is
      // spent — skip it (no prompt, no prevention) until the per-turn ledger resets. This check
      // follows the affectsAll fast path so one activation protects every simultaneous match.
      if (repl.oncePerTurnKey !== undefined && host.oncePerTurnFired?.(repl.oncePerTurnKey)) continue;
      opts.reentryGuard.activeReplacementKeys.add(activationKey);
      let did: boolean;
      try {
        did = await repl.preventCheck(ctx, leavingId);
      } finally {
        opts.reentryGuard.activeReplacementKeys.delete(activationKey);
      }
      if (did) {
        prevented.add(leavingId);
        if (repl.affectsAll) {
          firedAll.add(repl.id);
          // "They don't leave" applies to every matching permanent in THIS simultaneous
          // removal event. Determine that set from the activation context now: paying the
          // shared cost may move or expose the replacement's own source card, so rebuilding
          // its context for the second member would incorrectly make the already-activated
          // replacement disappear mid-event (BT26-033 Q7005).
          for (const simultaneousId of permanentIds) {
            if (host.permanentById(simultaneousId) === undefined) continue;
            if (repl.protects === undefined || repl.protects(ctx, simultaneousId)) prevented.add(simultaneousId);
          }
        }
        if (repl.oncePerTurnKey !== undefined) host.markOncePerTurnFired?.(repl.oncePerTurnKey);
        break;
      }
    }
  }
  return prevented;
}
