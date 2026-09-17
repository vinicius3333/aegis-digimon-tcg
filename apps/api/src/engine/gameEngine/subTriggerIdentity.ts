import type { Permanent } from "@aegis/shared";
import { isTamer, lookupDefinition } from "../cards/cardData.js";
import type { EffectContext } from "../effects/EffectContext.js";
import type { SubTriggerSubscription } from "../effects/subtriggers.js";

/**
 * A watcher's identity ACROSS continuous recomputes. Every recompute clears the continuous
 * subscriptions and re-installs them, so `sub.id` is stable only within one recompute cycle;
 * the (event, anchor, description, per-turn identity) tuple is what distinguishes the same
 * watcher across reinstalls while preserving separately conferred copies (BT10-011 Q1943).
 */
export function subTriggerIdentity(sub: SubTriggerSubscription): string {
  return [
    sub.event,
    sub.sourcePermanentId ?? "",
    sub.sourceInstanceId ?? "",
    sub.description,
    sub.oncePerTurnKey ?? "",
    sub.dedupeKey ?? "",
  ].join("|");
}

/**
 * A single printed `[Once Per Turn]` watcher can observe several simultaneous subjects of one
 * effect (for example, MoonMillenniummon deletes two Tamers). They are separate bus events, but
 * they are not separate activations that the player may order: only one copy of that exact
 * watcher may enter the pending-trigger UI. Keep distinct action paths, which carry different
 * `dedupeKey`s, independently selectable for cards whose one printed OPT genuinely contains
 * multiple triggered clauses.
 */
export function uniqueOncePerTurnWatcherOccurrences(items: readonly ArmedSubTrigger[]): ArmedSubTrigger[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (item.sub.oncePerTurnKey === undefined) return true;
    const identity = subTriggerIdentity(item.sub);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

/**
 * Whether the card directly beneath this permanent's top — the base it just digivolved from —
 * is a Tamer.
 *
 * KB Q6708 (BT23-101 Hudiemon, which may digivolve from a Tamer): "Digivolve from the Tamer as
 * such, and do not treat it as if it is a digivolving Digimon", so a watcher that reads "when a
 * Digimon digivolves" must not fire. The digivolving card's own [When Digivolving] window and
 * the digivolution bonus draw (Q6709) are unaffected — only the Digimon-digivolve watchers are.
 *
 * `stack` is ordered bottom..just-below-top (see `pushDigivolution`), so `at(-1)` is the base.
 */
export function digivolvedFromTamerBase(permanent: Permanent | undefined): boolean {
  const base = permanent?.stack.at(-1);
  if (base === undefined) return false;
  const definition = lookupDefinition(base.cardId);
  return definition !== undefined && isTamer(definition);
}

/**
 * A watcher's description as the players should read it. A player-scoped watcher tags its
 * description with the instance that installed it, so it can be told apart from the copy
 * conferred on another card; that tag is bookkeeping and never belongs in an announcement.
 */
export function subTriggerDescriptionFor(sub: SubTriggerSubscription, ctx: EffectContext): string {
  const tag = ` [${ctx.source.instanceId}]`;
  return sub.description.endsWith(tag) ? sub.description.slice(0, -tag.length) : sub.description;
}

/** A watcher that triggered, with the EffectContext bound at the moment its event fired. */
export interface ArmedSubTrigger {
  sub: SubTriggerSubscription;
  /** Context as of the event — what the ordering prompt is built from (controller, card). */
  ctx: EffectContext;
  /**
   * Context to run the body against, resolved when this watcher's turn actually comes. The
   * ordering prompt runs BETWEEN bodies, so an earlier body may have moved the board: a watcher
   * whose trigger condition stopped being met by then can no longer activate (CR §15-4-4-5), and
   * `fireSnapshot` drops it by re-checking `matches` against this fresh context. The deferred
   * paths pass the context bound when their event happened instead, because their trigger has
   * already activated (KB Q2611/Q2629).
   */
  contextAtFireTime: () => EffectContext | undefined;
  /** Unique occurrence captured by one `armedSubTriggers` call. */
  occurrence: {
    /** Once-per-turn keys that were unused when this event snapshot was armed. */
    oncePerTurnSnapshotKeys: ReadonlySet<string>;
    /** Shared success ledger for ordered bodies resolving this same event snapshot. */
    oncePerTurnSuccessfulKeys: Set<string>;
  };
}
