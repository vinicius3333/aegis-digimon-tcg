export const EFFECT_ORDER_ENABLED_STORAGE_KEY = "aegis.effectOrder.enabled";

function readEffectOrderEnabled(): boolean {
  try {
    return localStorage.getItem(EFFECT_ORDER_ENABLED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export const effectOrderEnabledStore = {
  enabled: readEffectOrderEnabled(),
  listeners: new Set<() => void>(),
};
