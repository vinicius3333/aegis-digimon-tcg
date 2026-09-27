import { buildTriggerKey } from "@aegis/shared";
import type { CollectedEffect } from "../effects/collect.js";

/**
 * The base `orderTriggers` key. ResolutionPlan adds stable per-occurrence suffixes
 * when the same watcher has multiple pending activations in a timing window.
 */
export function triggerKeyOf(collected: CollectedEffect): string {
  const base = buildTriggerKey(collected.source.instanceId, collected.effect.effectKey);
  // A preset belongs to the pending occurrence the player actually ordered. A later
  // deletion may trigger this unused OPT again inside the same ResolutionPlan.
  return collected.triggerOccurrence === undefined
    ? base
    : `${base}/occurrence/${encodeURIComponent(collected.triggerOccurrence)}`;
}
