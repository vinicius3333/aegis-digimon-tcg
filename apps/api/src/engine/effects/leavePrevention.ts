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
  /** Live keyword reactions use the same ordering and reentry guards as authored effects. */
  keywordReplacements?(permanentIds: string[]): ReplacementSubscription[];
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
  /** Let the affected player order simultaneous non-preventing and preventing leave reactions. */
  orderReplacements?(replacements: ReplacementSubscription[], seat: Seat): Promise<ReplacementSubscription[]>;
}

/**
 * Consult active "prevent"/"instead" leave/delete replacements for the permanents about to be
 * removed (the D_leave_area_prevent family). For each leaving permanent:
 *
 * - "instead" reactions (＜Decode＞, BT20-091's "you may play 1 [Omekamon]") gate on
 *   `causeAllows` + `appliesTo` (+ `oncePerTurnKey`) and run `apply`. Side-effect-only reactions
 *   let the leave continue; true relocation replacements add the permanent to the returned set.
 * - "prevent" reactions then run in order: each must (a) allow the removal CAUSE (a "by an
 *   opponent's effect" reaction must not fire on the controller's own deletion; "other than by
 *   battle" must not fire on combat), (b) PROTECT that permanent (self-reaction => only its own
 *   source; a filtered reaction => any matching permanent), and (c) successfully run its
 *   preventCheck (prompt + pay the all-or-nothing cost). Each eligible prevention may pay its
 *   own cost for the same leave event; once-per-turn and re-entry keys still gate reactivation.
 *
 * When both modes apply, the affected player orders the reactions. Returns the subset whose
 * original removal was prevented or superseded by a true relocation replacement.
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
  opts: {
    isBounce?: boolean;
    /** DigiXros/material declarations are player actions, not an effect owned by the player. */
    playerAction?: boolean;
    /**
     * Run only the "instead" (side-effect) replacements and offer no prevention. Used after a
     * keyword prevention (＜Barrier＞) already stopped the leave: preventing it does not cancel
     * the same event's sibling replacement, which is still offered (KB Q6250).
     */
    insteadOnly?: boolean;
    reentryGuard: { activeReplacementKeys: Set<string> };
  },
): Promise<Set<string>> {
  const prevented = new Set<string>();
  // wouldLeavePlay covers any leave (delete + hand/deck bounce); wouldBeDeleted watches
  // deletion ONLY — a bounce must NOT trigger a deletion-only reaction (BT9-044, RB1-016).
  // replacementsFor already excludes "reduceCost" (unrelated to leave/delete), leaving the
  // "prevent" and "instead" modes this consult handles.
  let replacements = [
    ...(host.keywordReplacements?.(permanentIds) ?? []),
    ...(opts.isBounce === true ? [] : host.subTriggers.replacementsFor("wouldBeDeleted")),
    ...host.subTriggers.replacementsFor("wouldLeavePlay"),
  ];
  if (replacements.length === 0) return prevented;
  const seat =
    opts.playerAction === true ? undefined : (resolvingSeat ?? (cause === "byEffect" ? host.turnSeat : undefined));
  const firedAll = new Set<number>(); // affectsAll replacements that already paid this consult
  for (const leavingId of permanentIds) {
    if (prevented.has(leavingId)) continue;
    const leaving = host.permanentById(leavingId);
    if (leaving === undefined) continue;
    const eligible: { repl: ReplacementSubscription; ctx: EffectContext; activationKey: string }[] = [];
    for (const repl of replacements) {
      if (repl.mode !== "instead" && repl.mode !== "prevent") continue;
      if (opts.insteadOnly === true && repl.mode !== "instead") continue;
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
      if (repl.mode === "instead") {
        if (repl.appliesTo && !repl.appliesTo(ctx, leavingId)) continue;
      } else if (repl.protects && !repl.protects(ctx, leavingId)) continue;
      eligible.push({ repl, ctx, activationKey });
    }

    let ordered = eligible;
    // Exactly one replacement applies to one leave event (KB Q5352), and WHICH one is the
    // affected player's choice — the rules do not name a survivor. Any set with more than one
    // eligible replacement therefore goes to that player, not only a set that happens to mix
    // "instead" with "prevent". The chooser's answer moves the picked replacement to the front;
    // an unanswered or empty response keeps the engine's offered order.
    if (host.orderReplacements !== undefined && eligible.length > 1) {
      const orderedReplacements = await host.orderReplacements(
        eligible.map(({ repl }) => repl),
        leaving.controllerSeat,
      );
      const byId = new Map(eligible.map((candidate) => [candidate.repl.id, candidate]));
      ordered = orderedReplacements
        .map((replacement) => byId.get(replacement.id))
        .filter((value) => value !== undefined);
    }

    // The source whose "instead" replacement already replaced this leave event, if any.
    let insteadAppliedBySource: string | undefined;
    for (const { repl, ctx, activationKey } of ordered) {
      if (opts.reentryGuard.activeReplacementKeys.has(activationKey)) continue;
      if (repl.mode === "instead") {
        // Exactly ONE replacement applies to one leave event (KB Q5352): once another card's
        // "instead" has replaced it, this one no longer has an event to replace. Sibling
        // clauses of the SAME source keep their existing behaviour — they are one card's
        // reaction to its own event, which the activation-identity guard already governs.
        const replSource = repl.sourcePermanentId ?? repl.sourceInstanceId;
        if (insteadAppliedBySource !== undefined && replSource !== insteadAppliedBySource) continue;
        if (repl.oncePerTurnKey !== undefined && host.oncePerTurnFired?.(repl.oncePerTurnKey)) continue;
        opts.reentryGuard.activeReplacementKeys.add(activationKey);
        let applied: void | boolean;
        try {
          applied = await repl.apply(ctx);
        } finally {
          opts.reentryGuard.activeReplacementKeys.delete(activationKey);
        }
        const relocated = host.permanentById(leavingId) === undefined;
        if (repl.oncePerTurnKey !== undefined) host.markOncePerTurnFired?.(repl.oncePerTurnKey);
        if (relocated) {
          prevented.add(leavingId);
          break;
        }
        // An "instead" whose body actually ran has replaced the event even though it left the
        // permanent in place (BT23-075 Eater EDEN plays a card from hand and stays put). A body
        // that reported it did NOT apply — declined, or its cost could not be paid — leaves the
        // event open for another card's replacement. Prevention is never suppressed here: a
        // prevention and a same-event "instead" are siblings on one event (KB Q6250).
        if (applied !== false) insteadAppliedBySource = repl.sourcePermanentId ?? repl.sourceInstanceId ?? "";
        continue;
      }
      // Q4261/Q4262: each eligible prevention may pay for the same leave event. The
      // activation key/reentry guard still prevents only the replacement already resolving
      // from recursively re-entering itself.
      if (repl.mode !== "prevent") continue;
      if (repl.affectsAll && firedAll.has(repl.id)) {
        prevented.add(leavingId);
        continue;
      }
      if (repl.oncePerTurnKey !== undefined && host.oncePerTurnFired?.(repl.oncePerTurnKey)) continue;
      opts.reentryGuard.activeReplacementKeys.add(activationKey);
      let did: boolean;
      try {
        did = await repl.preventCheck(ctx, leavingId);
      } finally {
        opts.reentryGuard.activeReplacementKeys.delete(activationKey);
      }
      if (!did) continue;
      prevented.add(leavingId);
      if (repl.affectsAll) {
        firedAll.add(repl.id);
        for (const simultaneousId of permanentIds) {
          if (host.permanentById(simultaneousId) === undefined) continue;
          if (repl.protects === undefined || repl.protects(ctx, simultaneousId)) prevented.add(simultaneousId);
        }
      }
      if (repl.oncePerTurnKey !== undefined) host.markOncePerTurnFired?.(repl.oncePerTurnKey);
    }
  }
  return prevented;
}
