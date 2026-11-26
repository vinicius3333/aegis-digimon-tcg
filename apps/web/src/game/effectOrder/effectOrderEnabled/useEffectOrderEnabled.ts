import { useSyncExternalStore } from "react";
import { effectOrderEnabledStore } from "@/game/effectOrder/effectOrderEnabled/effectOrderEnabledStore";
import { isEffectOrderEnabled } from "@/game/effectOrder/effectOrderEnabled/isEffectOrderEnabled";

function subscribeEffectOrderEnabled(listener: () => void): () => void {
  effectOrderEnabledStore.listeners.add(listener);
  return () => effectOrderEnabledStore.listeners.delete(listener);
}

export function useEffectOrderEnabled(): boolean {
  return useSyncExternalStore(subscribeEffectOrderEnabled, isEffectOrderEnabled, () => false);
}
