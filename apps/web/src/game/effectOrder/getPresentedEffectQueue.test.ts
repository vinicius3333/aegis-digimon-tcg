import { describe, expect, it } from "vitest";
import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";
import type { ServerEvent } from "@aegis/shared/protocol/events";
import { effectNoticeFromEvent, type MatchNotice } from "@/game/notices";
import { getPresentedEffectQueue } from "@/game/effectOrder/getPresentedEffectQueue";

const watchers = ["perm-1", "perm-2", "perm-3"];

function triggered(resolving: number): ServerEvent {
  return {
    kind: "effectTriggered",
    seat: 0,
    sourceCardId: "BT3-092",
    sourcePermanentId: watchers[resolving],
    effectKey: `watch-${resolving}`,
    description: "When an opponent's Digimon is deleted",
    timing: "OnDeletion",
    effectQueue: watchers.slice(resolving).map((sourcePermanentId, offset): EffectQueueEntry => ({
      seat: 0,
      position: offset + 1,
      sourcePermanentId,
      ...(offset === 0 ? { isResolving: true } : {}),
    })),
  };
}

function presentInOrder(events: readonly ServerEvent[]): (readonly EffectQueueEntry[] | undefined)[] {
  const notices: MatchNotice[] = [];
  return events.map((event, step) => {
    const notice = effectNoticeFromEvent(event, 0, `notice-${step}`, step);
    if (notice) {
      notices.push(notice);
    }
    return getPresentedEffectQueue({ notices });
  });
}

const resolvingOf = (queue: readonly EffectQueueEntry[] | undefined) =>
  queue?.find((entry) => entry.isResolving)?.sourcePermanentId;

describe("presented effect queue", () => {
  it("moves NOW with each resolution of a chain that arrives in one batch", () => {
    const queues = presentInOrder([triggered(0), triggered(1), triggered(2)]);

    expect(queues.map(resolvingOf)).toEqual(["perm-1", "perm-2", "perm-3"]);
    expect(queues.map((queue) => queue?.length)).toEqual([3, 2, 1]);
  });

  it("keeps NOW on the resolving effect while its clause continues, and clears it for an unqueued effect", () => {
    const clause: ServerEvent = {
      kind: "effectClauseAdvanced",
      seat: 0,
      sourceCardId: "BT3-092",
      sourcePermanentId: "perm-1",
      effectKey: "watch-0",
      clause: "Then, delete 1 Digimon.",
    } as ServerEvent;
    const lone: ServerEvent = { ...triggered(0), effectKey: "lone", effectQueue: undefined } as ServerEvent;
    const queues = presentInOrder([triggered(0), clause, lone]);

    expect(queues.map(resolvingOf)).toEqual(["perm-1", "perm-1", undefined]);
    expect(queues[2]).toBeUndefined();
  });
});
