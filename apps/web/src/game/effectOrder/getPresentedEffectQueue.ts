import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";
import type { MatchNotice } from "@/game/notices";

type Params = { notices: readonly MatchNotice[] };

export function getPresentedEffectQueue({ notices }: Params): readonly EffectQueueEntry[] | undefined {
  for (let index = notices.length - 1; index >= 0; index -= 1) {
    const body = notices[index]!.body;
    if (body.variant === "effect" && body.triggerTiming !== undefined) {
      return body.effectQueue;
    }
  }
  return undefined;
}
