import type { MatchReplay } from "@aegis/shared/replays";
import { Zone, type Seat } from "@aegis/shared/schema/enums";
import type { ReplayTimelineEvent } from "@/replays/ReplayTimelineEvent";
import { ReplayTimelineEventKind } from "@/replays/ReplayTimelineEventKind";

type Params = { replay: MatchReplay };

export function buildReplayTimelineEvents({ replay }: Params): ReplayTimelineEvent[] {
  return replay.frames.flatMap((frame, index) => {
    const previous = replay.frames[index - 1];
    const events: ReplayTimelineEvent[] = [];
    if (
      !previous ||
      previous.state.turnCount !== frame.state.turnCount ||
      previous.state.turnSeat !== frame.state.turnSeat
    ) {
      events.push({
        index,
        kind: ReplayTimelineEventKind.TURN.value,
        seat: frame.state.turnSeat,
        turn: frame.state.turnCount,
        amount: 1,
      });
    }
    for (const seat of [0, 1] as const satisfies readonly Seat[]) {
      let removed = 0;
      let recovered = 0;
      for (const event of frame.events) {
        if (event.kind === "securityRecovered" && event.seat === seat) {
          recovered += event.amount;
        }
        if (event.kind === "securityRevealed" && event.seat === seat) {
          removed++;
        }
        if (
          event.kind === "cardsMoved" &&
          event.from === Zone.Security &&
          event.to !== Zone.Security &&
          !event.fromSecurityCheck &&
          (event.fromSeat ?? event.seat) === seat
        ) {
          removed += event.instanceIds.length;
        }
      }
      const decrease = previous
        ? previous.state.players[seat]!.securityCount + recovered - frame.state.players[seat]!.securityCount
        : 0;
      const amount = Math.max(removed, decrease);
      if (amount > 0) {
        events.push({ index, kind: ReplayTimelineEventKind.SECURITY.value, seat, turn: frame.state.turnCount, amount });
      }
    }
    return events;
  });
}
