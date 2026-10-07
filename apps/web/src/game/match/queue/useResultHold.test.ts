// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { activePacing } from "../../pacing";
import { RESULT_STALL_BUDGET_MS, resultHoldCeilingMs, useResultHold } from "./useResultHold";

type Props = Parameters<typeof useResultHold>[0];

function fakeQueue(mode: "live" | "drain" = "live") {
  return { skip: vi.fn<() => void>(), getMode: () => mode, isPaused: () => false };
}

function running(queue: Props["queue"], overrides: Partial<Props> = {}): Props {
  return {
    gameOver: false,
    gameOverPresented: false,
    playbackPending: true,
    lastClauseAt: undefined,
    queueActivity: 0,
    queue,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

it("holds the result while playback is pending and shows it once the queue drains", () => {
  const queue = fakeQueue();
  const hook = renderHook((props: Props) => useResultHold(props), { initialProps: running(queue) });
  hook.rerender(running(queue, { gameOver: true, gameOverPresented: true }));
  expect(hook.result.current).toBe(true);
  hook.rerender(running(queue, { gameOver: true, gameOverPresented: true, playbackPending: false }));
  expect(hook.result.current).toBe(false);
  expect(queue.skip).not.toHaveBeenCalled();
});

it("waits for the batch that carries the end of the match", () => {
  const queue = fakeQueue();
  const hook = renderHook((props: Props) => useResultHold(props), { initialProps: running(queue) });
  hook.rerender(running(queue, { gameOver: true, playbackPending: false }));
  expect(hook.result.current).toBe(true);
  hook.rerender(running(queue, { gameOver: true, gameOverPresented: true, playbackPending: false }));
  expect(hook.result.current).toBe(false);
});

it("gives the last clause its readable beat before the result covers it", () => {
  const queue = fakeQueue();
  const hook = renderHook((props: Props) => useResultHold(props), { initialProps: running(queue) });
  const ended = running(queue, {
    gameOver: true,
    gameOverPresented: true,
    playbackPending: false,
    lastClauseAt: Date.now(),
  });
  hook.rerender(ended);
  expect(hook.result.current).toBe(true);
  act(() => vi.advanceTimersByTime(activePacing().clauseReadableMs - 1));
  hook.rerender(ended);
  expect(hook.result.current).toBe(true);
  act(() => vi.advanceTimersByTime(1));
  hook.rerender(ended);
  expect(hook.result.current).toBe(false);
});

it("fast-forwards a stalled queue and shows the result", () => {
  const queue = fakeQueue();
  const hook = renderHook((props: Props) => useResultHold(props), { initialProps: running(queue) });
  hook.rerender(running(queue, { gameOver: true, gameOverPresented: true }));
  act(() => vi.advanceTimersByTime(RESULT_STALL_BUDGET_MS - 1));
  expect(hook.result.current).toBe(true);
  act(() => vi.advanceTimersByTime(1));
  expect(hook.result.current).toBe(false);
  expect(queue.skip).toHaveBeenCalledOnce();
});

it("caps a busy queue's hold at the ceiling", () => {
  const queue = fakeQueue();
  const hook = renderHook((props: Props) => useResultHold(props), { initialProps: running(queue) });
  let activity = 0;
  const step = RESULT_STALL_BUDGET_MS / 2;
  for (let elapsed = 0; elapsed + step < resultHoldCeilingMs(); elapsed += step) {
    hook.rerender(running(queue, { gameOver: true, gameOverPresented: true, queueActivity: ++activity }));
    act(() => vi.advanceTimersByTime(step));
    expect(hook.result.current).toBe(true);
  }
  act(() => vi.advanceTimersByTime(step));
  expect(hook.result.current).toBe(false);
  expect(queue.skip).toHaveBeenCalledOnce();
});

it("never holds a match that was already over when the screen joined it", () => {
  const queue = fakeQueue();
  const hook = renderHook((props: Props) => useResultHold(props), {
    initialProps: running(queue, { gameOver: true, gameOverPresented: false }),
  });
  expect(hook.result.current).toBe(false);
});

it("never holds when the queue drains without playing (reduced motion, hidden tab)", () => {
  const queue = fakeQueue("drain");
  const hook = renderHook((props: Props) => useResultHold(props), { initialProps: running(queue) });
  hook.rerender(running(queue, { gameOver: true, gameOverPresented: true }));
  expect(hook.result.current).toBe(false);
});
