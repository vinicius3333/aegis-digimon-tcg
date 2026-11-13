import type { CollectedEffect } from "#api/engine/effects/collect";

export function presentsAsInherited(collected: CollectedEffect): boolean {
  return collected.effect.isInherited && collected.isGainedMainEffect !== true;
}
