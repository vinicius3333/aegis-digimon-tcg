import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";
import type { Translate } from "@/i18n/translationTypes";

type Params = {
  entry: EffectQueueEntry;
  t: Translate;
};

export function getEffectOrderLabel({ entry, t }: Params): string {
  if (entry.isResolving) {
    return t("effectOrder.resolvingPosition", { position: entry.position });
  }
  if (entry.lastPosition !== undefined) {
    return t("effectOrder.range", { first: entry.position, last: entry.lastPosition });
  }
  return t("effectOrder.position", { position: entry.position });
}
