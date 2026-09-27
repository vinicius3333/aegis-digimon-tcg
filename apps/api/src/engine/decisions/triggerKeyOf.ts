import { buildTriggerKey } from "@aegis/shared";
import type { CollectedEffect } from "../effects/collect.js";

/**
 * The base `orderTriggers` key. ResolutionPlan adds stable per-occurrence suffixes
 * when the same watcher has multiple pending activations in a timing window.
 */
export function triggerKeyOf(collected: CollectedEffect): string {
  return buildTriggerKey(collected.source.instanceId, collected.effect.effectKey);
}
