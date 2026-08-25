// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import type { ServerEvent } from "@aegis/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOpponentActionFeed } from "./useOpponentActionFeed";
import { TIMINGS } from "./timings";

afterEach(() => vi.useRealTimers());

// A play is shown by the centre-screen showcase, not the feed, so the fixture is
// an action the feed still narrates.
function opponentAction(cardId: string): ServerEvent {
  return { kind: "movedFromBreeding", seat: 1, permanentId: `permanent:${cardId}`, cardId } as ServerEvent;
}

describe("useOpponentActionFeed", () => {
  it("does not replay history and shows the newest fresh event in a batch", () => {
    const history = [opponentAction("BT1-010")];
    const { result, rerender } = renderHook(
      ({ events }) =>
        useOpponentActionFeed({
          events,
          viewerSeat: 0,
          paused: false,
          trailCapacity: 1,
          matchKey: "match-1",
        }),
      { initialProps: { events: history } },
    );

    expect(result.current.current).toBeUndefined();

    rerender({ events: [...history, opponentAction("AD1-001"), opponentAction("BT1-009")] });
    expect(result.current.current?.cardId).toBe("BT1-009");
    expect(result.current.trail.map(({ cardId }) => cardId)).toEqual(["AD1-001"]);
    expect(result.current.pending).toEqual([]);
  });

  it("recognizes cloned reconnect history and enqueues only its fresh suffix", () => {
    const history = [opponentAction("BT1-010")];
    const { result, rerender } = renderHook(
      ({ events }) =>
        useOpponentActionFeed({
          events,
          viewerSeat: 0,
          paused: false,
          trailCapacity: 1,
          matchKey: "match-1",
        }),
      { initialProps: { events: history } },
    );

    rerender({ events: [structuredClone(history[0]!), opponentAction("AD1-001")] });
    expect(result.current.current?.cardId).toBe("AD1-001");
    expect(result.current.pending).toEqual([]);
  });

  it("restarts the full display duration for the newest action", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ events }) =>
        useOpponentActionFeed({
          events,
          viewerSeat: 0,
          paused: false,
          trailCapacity: 1,
          matchKey: "match-1",
        }),
      { initialProps: { events: [] as ServerEvent[] } },
    );

    rerender({ events: [opponentAction("BT1-010"), opponentAction("AD1-001")] });
    expect(result.current.current?.cardId).toBe("AD1-001");

    act(() => vi.advanceTimersByTime(TIMINGS.feedAction - 1));
    expect(result.current.current?.cardId).toBe("AD1-001");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.current).toBeUndefined();
  });

  it("pauses the remaining time while a blocking surface is open", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ events, paused }) =>
        useOpponentActionFeed({
          events,
          viewerSeat: 0,
          paused,
          trailCapacity: 1,
          matchKey: "match-1",
        }),
      { initialProps: { events: [] as ServerEvent[], paused: false } },
    );

    rerender({ events: [opponentAction("BT1-010")], paused: false });
    act(() => vi.advanceTimersByTime(1000));
    rerender({ events: [opponentAction("BT1-010")], paused: true });
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.current?.cardId).toBe("BT1-010");

    rerender({ events: [opponentAction("BT1-010")], paused: false });
    act(() => vi.advanceTimersByTime(TIMINGS.feedAction - 1000 - 1));
    expect(result.current.current?.cardId).toBe("BT1-010");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.current).toBeUndefined();
  });
});
