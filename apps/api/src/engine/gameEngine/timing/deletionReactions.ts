import { EffectTiming, type CardInstance, type Seat } from "@aegis/shared";
import { definitionOf } from "../../cards/cardData.js";
import type { TriggerInfo } from "../../effects/EffectContext.js";
import { findLooseInstance } from "../intents.js";
import type { GameEngine } from "../../GameEngine.js";
import { shouldDeferNestedTiming } from "../windows.js";

/**
 * Resolve the two trigger families created by one deletion. Ascension is deliberately
 * represented in the ordinary orderTriggers channel: if it resolves first, the card leaves
 * trash and the subsequent On Deletion collection correctly drops that pending effect (Q7100).
 *
 * `fire` opens the [On Deletion] window; the pooled rule-check flush substitutes the
 * non-deferring runner so the whole pass resolves as one window.
 */
export async function resolveDeletionReactions(
  engine: GameEngine,
  trigger: TriggerInfo,
  ascensionCandidates: readonly { instanceId: string; seat: Seat }[],
  fire: (deletionTrigger: TriggerInfo) => Promise<void> = (deletionTrigger) =>
    engine.fireTiming(EffectTiming.OnDestroyedAnyone, deletionTrigger),
  transientCandidates: readonly CardInstance[] = [],
  deferNested = true,
): Promise<void> {
  // A rule-check pass pools every deletion it performs, Ascension offer included, and
  // resolves them as one simultaneous group once the fixpoint converges (§17-1-3,
  // §15-4-3-3). Without engine each sweep would resolve its own [On Deletion] effects
  // before the next sweep even ran.
  if (engine.ruleTriggerPool !== undefined) {
    engine.ruleTriggerPool.push({
      trigger: { ...trigger },
      ascensionCandidates: [...ascensionCandidates],
      transientCandidates: [...transientCandidates],
    });
    return;
  }
  // A deletion inside an effect creates one reaction group. Park Ascension together
  // with On Deletion until that body ends; otherwise Ascension can remove the card
  // from trash before the controller's chosen On Deletion-first order runs.
  if (deferNested && shouldDeferNestedTiming(engine) && !engine.flushingDeferredTimingWindows) {
    engine.deferredTimingWindows.push({
      timing: EffectTiming.OnDestroyedAnyone,
      trigger: { ...trigger },
      transientCandidates: [...transientCandidates],
      ascensionCandidates: [...ascensionCandidates],
    });
    return;
  }
  const ascend = async ({ instanceId, seat }: { instanceId: string; seat: Seat }): Promise<void> => {
    if (findLooseInstance(engine, instanceId) === undefined) return;
    const response = await engine.decisions.request({
      seat,
      kind: "selectCards",
      promptText: "＜Ascension＞: place engine card at the top of your security stack?",
      options: { candidateInstanceIds: [instanceId], min: 0, max: 1 },
    });
    if (response.kind === "selectCards" && response.instanceIds.includes(instanceId)) {
      await engine.primitives.ascendToSecurity(instanceId);
    }
  };

  // Every simultaneously-deleted Ascension candidate that ALSO prints its own [On Deletion]
  // needs its own ascend-vs-on-deletion ordering choice (§15-4-3-4/-3-5) — not just the
  // first one found. A second such candidate in the same batch previously fell through to
  // the plain `ascend()` loop below with no ordering choice at all, always resolving its
  // own [On Deletion] (inside the single shared `fire`) before it could ever be asked to
  // ascend first.
  const selfEffectCandidates = ascensionCandidates.filter(({ instanceId }) => {
    const card = findLooseInstance(engine, instanceId);
    return card !== undefined && definitionOf(card).effectText?.includes("[On Deletion]") === true;
  });
  if (selfEffectCandidates.length === 0) {
    await fire(trigger);
    for (const pending of ascensionCandidates) await ascend(pending);
    return;
  }

  const ascendBeforeFire: { instanceId: string; seat: Seat }[] = [];
  const ascendAfterFire: { instanceId: string; seat: Seat }[] = [];
  for (const candidate of selfEffectCandidates) {
    const ascensionKey = `ascension/${candidate.instanceId}`;
    const onDeletionKey = `on-deletion/${candidate.instanceId}`;
    const response = await engine.decisions.request({
      seat: candidate.seat,
      kind: "orderTriggers",
      promptText: "Choose whether to activate ＜Ascension＞ or [On Deletion] first.",
      options: { triggerKeys: [ascensionKey, onDeletionKey] },
    });
    const ascensionFirst = response.kind === "orderTriggers" && response.order[0] === ascensionKey;
    (ascensionFirst ? ascendBeforeFire : ascendAfterFire).push(candidate);
  }
  for (const candidate of ascendBeforeFire) await ascend(candidate);
  await fire(trigger);
  for (const candidate of ascendAfterFire) await ascend(candidate);
  for (const pending of ascensionCandidates) {
    if (!selfEffectCandidates.some(({ instanceId }) => instanceId === pending.instanceId)) await ascend(pending);
  }
}
