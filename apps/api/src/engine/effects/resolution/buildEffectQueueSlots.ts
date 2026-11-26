import type { Seat } from "@aegis/shared";
import type { CollectedEffect } from "#api/engine/effects/collect";
import type { EffectQueueSlot } from "#api/engine/effects/resolution/EffectQueueSlot";

type Params = {
  pending: readonly CollectedEffect[];
  turnSeat: Seat;
  getTier: (collected: CollectedEffect) => number;
  getSeat: (collected: CollectedEffect) => Seat;
  getPlanIndex: (collected: CollectedEffect) => number;
};

export function buildEffectQueueSlots({
  pending,
  turnSeat,
  getTier,
  getSeat,
  getPlanIndex,
}: Params): EffectQueueSlot[] {
  const getSeatRank = (collected: CollectedEffect): number => (getSeat(collected) === turnSeat ? 0 : 1);
  const sorted = [...pending].sort(
    (first, second) => getTier(second) - getTier(first) || getSeatRank(first) - getSeatRank(second),
  );
  const groups = new Map<string, CollectedEffect[]>();
  for (const collected of sorted) {
    const key = `${getTier(collected)} ${getSeat(collected)}`;
    groups.set(key, [...(groups.get(key) ?? []), collected]);
  }
  return [...groups.values()].flatMap((group) => {
    const planned = group
      .filter((collected) => getPlanIndex(collected) >= 0)
      .sort((first, second) => getPlanIndex(first) - getPlanIndex(second));
    const unplanned = group.filter((collected) => getPlanIndex(collected) < 0);
    return [
      ...planned.map((collected) => ({ effects: [collected], isResolving: false })),
      ...(unplanned.length > 0 ? [{ effects: unplanned, isResolving: false }] : []),
    ];
  });
}
