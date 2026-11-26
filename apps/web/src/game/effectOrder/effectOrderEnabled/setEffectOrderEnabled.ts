import {
  EFFECT_ORDER_ENABLED_STORAGE_KEY,
  effectOrderEnabledStore,
} from "@/game/effectOrder/effectOrderEnabled/effectOrderEnabledStore";

export function setEffectOrderEnabled(enabled: boolean): void {
  if (effectOrderEnabledStore.enabled === enabled) {
    return;
  }
  effectOrderEnabledStore.enabled = enabled;
  try {
    localStorage.setItem(EFFECT_ORDER_ENABLED_STORAGE_KEY, String(enabled));
  } catch {}
  for (const listener of effectOrderEnabledStore.listeners) {
    listener();
  }
}
