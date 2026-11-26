import type { CollectedEffect } from "#api/engine/effects/collect";

export type EffectQueueSlot = {
  effects: readonly CollectedEffect[];
  isResolving: boolean;
};
