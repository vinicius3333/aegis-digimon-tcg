import { effectOrderEnabledStore } from "@/game/effectOrder/effectOrderEnabled/effectOrderEnabledStore";

export function isEffectOrderEnabled(): boolean {
  return effectOrderEnabledStore.enabled;
}
