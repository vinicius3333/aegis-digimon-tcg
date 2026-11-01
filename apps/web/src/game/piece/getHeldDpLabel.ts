import type { Translate } from "@/i18n/translationTypes";
import { getSignedDeltaPrefix } from "@/game/piece/getSignedDeltaPrefix";

type GetHeldDpLabelParams = {
  delta: number;
  t: Translate;
};

export function getHeldDpLabel({ delta, t }: GetHeldDpLabelParams): string {
  return t("overlay.heldDp", { delta: `${getSignedDeltaPrefix(delta)}${Math.abs(delta).toLocaleString()}` });
}
