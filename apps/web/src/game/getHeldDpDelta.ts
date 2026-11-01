import type { Permanent } from "@aegis/shared";
import { readFieldEffects } from "@/game/readFieldEffects";

export function getHeldDpDelta(permanent: Pick<Permanent, "heldDpEffectsJson">): number | undefined {
  const heldDpEffects = readFieldEffects(permanent.heldDpEffectsJson).filter((effect) => effect.kind === "dp");
  if (heldDpEffects.length === 0) {
    return undefined;
  }
  return heldDpEffects.reduce((total, effect) => total + Number(effect.value), 0);
}
