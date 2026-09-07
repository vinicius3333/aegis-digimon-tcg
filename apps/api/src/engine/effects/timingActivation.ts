import type { ContinuousEffectLedger } from "./continuous.js";

/** Shared activation gate for timing masks and unconditional timing restrictions. */
export function isTimingActivationDisabled(
  continuous: Pick<ContinuousEffectLedger, "hasRestriction" | "isTimingEffectDisabled">,
  permanentId: string,
  timing: "whenDigivolving" | "whenAttacking" | "onPlay",
): boolean {
  if (timing === "whenDigivolving" && continuous.hasRestriction(permanentId, "cannotActivateWhenDigivolving")) {
    return true;
  }
  if (timing === "onPlay" && continuous.hasRestriction(permanentId, "activateOnPlay")) return true;
  return (
    continuous.isTimingEffectDisabled(permanentId, timing) && !continuous.hasRestriction(permanentId, "beAffected")
  );
}
