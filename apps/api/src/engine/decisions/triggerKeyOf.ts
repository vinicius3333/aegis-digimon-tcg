import { buildTriggerKey } from "@aegis/shared";
import type { CollectedEffect } from "../effects/collect.js";

/**
 * The `orderTriggers` key of a collected effect's first pending activation. A second
 * activation of the same effect in one prompt gets an `/activation-N` suffix instead, so
 * it never matches this key and its questions are asked rather than preset.
 */
export function triggerKeyOf(collected: CollectedEffect): string {
  const base = buildTriggerKey(collected.source.instanceId, collected.effect.effectKey);
  // A preset belongs to the pending occurrence the player actually ordered. A later
  // deletion may trigger this unused OPT again inside the same ResolutionPlan.
  return collected.triggerOccurrence === undefined
    ? base
    : `${base}/occurrence/${encodeURIComponent(collected.triggerOccurrence)}`;
}
