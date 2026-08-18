// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import type { ServerEvent } from "@aegis/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOpponentActionFeed } from "./useOpponentActionFeed";

afterEach(() => vi.useRealTimers());

function played(cardId: string): ServerEvent {
  return { kind: "cardPlayed", seat: 1, cardId };
}

describe("useOpponentActionFeed", () => {
  it("does not replay history and shows the newest fresh event in a batch", () => {
    const history = [played("BT1-010")];
    const { result, rerender } = renderHook(
      ({ events }) => useOpponentActionFeed({
        events,
        viewerSeat: 0,
        paused: false,
        trailCapacity: 1,
        matchKey: "match-1",
      }),
      { initialProps: { events: history } },
    );

    expect(result.current.current).toBeUndefined();

    rerender({ events: [...history, played("AD1-001"), played("BT1-009")] });
    expect(result.current.current?.cardId).toBe("BT1-009");
    expect(result.current.trail.map(({ cardId }) => cardId)).toEqual(["AD1-001"]);
    expect(result.current.pending).toEqual([]);
  });

  it("recognizes cloned reconnect history and enqueues only its fresh suffix", () => {
    const history = [played("BT1-010")];
    const { result, rerender } = renderHook(
      ({ events }) => useOpponentActionFeed({
        events,
        viewerSeat: 0,
        paused: false,
        trailCapacity: 1,
        matchKey: "match-1",
      }),
      { initialProps: { events: history } },
    );

    rerender({ events: [structuredClone(history[0]!), played("AD1-001")] });
    expect(result.current.current?.cardId).toBe("AD1-001");
    expect(result.current.pending).toEqual([]);
  });

  it("restarts the full display duration for the newest action", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ events }) => useOpponentActionFeed({
        events,
        viewerSeat: 0,
        paused: false,
        trailCapacity: 1,
        matchKey: "match-1",
      }),
      { initialProps: { events: [] as ServerEvent[] } },
    );

    rerender({ events: [played("BT1-010"), played("AD1-001")] });
    expect(result.current.current?.cardId).toBe("AD1-001");

    act(() => vi.advanceTimersByTime(2799));
    expect(result.current.current?.cardId).toBe("AD1-001");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.current).toBeUndefined();
  });

  it("pauses the remaining time while a blocking surface is open", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ events, paused }) => useOpponentActionFeed({
        events,
        viewerSeat: 0,
        paused,
        trailCapacity: 1,
        matchKey: "match-1",
      }),
      { initialProps: { events: [] as ServerEvent[], paused: false } },
    );

    rerender({ events: [played("BT1-010")], paused: false });
    act(() => vi.advanceTimersByTime(1000));
    rerender({ events: [played("BT1-010")], paused: true });
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.current?.cardId).toBe("BT1-010");

    rerender({ events: [played("BT1-010")], paused: false });
    act(() => vi.advanceTimersByTime(1799));
    expect(result.current.current?.cardId).toBe("BT1-010");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.current).toBeUndefined();
  });
});
