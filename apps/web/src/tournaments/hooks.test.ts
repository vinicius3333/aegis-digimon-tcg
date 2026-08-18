// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { countdownLevel, formatRemaining, useCountdown, usePolledRequest, usePolling } from "./hooks";
import { observeServerTime, resetServerClock, serverNow } from "./serverClock";

describe("countdownLevel", () => {
  it("names each warning threshold rather than only coloring it", () => {
    expect(countdownLevel(null)).toBe("none");
    expect(countdownLevel(10 * 60_000)).toBe("normal");
    expect(countdownLevel(300_000)).toBe("warning_5m");
    expect(countdownLevel(120_001)).toBe("warning_5m");
    expect(countdownLevel(120_000)).toBe("warning_2m");
    expect(countdownLevel(60_001)).toBe("warning_2m");
    expect(countdownLevel(60_000)).toBe("warning_1m");
    expect(countdownLevel(1)).toBe("warning_1m");
    expect(countdownLevel(0)).toBe("expired");
    expect(countdownLevel(-5_000)).toBe("expired");
  });

  it("formats remaining time and never counts below zero", () => {
    expect(formatRemaining(null)).toBe("--:--");
    expect(formatRemaining(65_000)).toBe("1:05");
    expect(formatRemaining(3_725_000)).toBe("1:02:05");
    expect(formatRemaining(-1)).toBe("0:00");
  });
});

describe("useCountdown", () => {
  beforeEach(() => {
    resetServerClock();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-12T12:00:00.000Z"));
  });
  afterEach(() => {
    // Vitest runs without `globals`, so testing-library's auto-cleanup is not registered and a
    // hook left mounted would keep its interval alive into the next test.
    cleanup();
    vi.useRealTimers();
    resetServerClock();
  });

  it("crosses the warning thresholds as server time advances", () => {
    const deadline = Date.now() + 6 * 60_000;
    const { result } = renderHook(() => useCountdown(deadline));
    expect(result.current.level).toBe("normal");

    act(() => { vi.advanceTimersByTime(90_000); });
    expect(result.current.level).toBe("warning_5m");

    act(() => { vi.advanceTimersByTime(3 * 60_000); });
    expect(result.current.level).toBe("warning_2m");

    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.level).toBe("warning_1m");

    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.level).toBe("expired");
    expect(result.current.text).toBe("0:00");
  });

  it("counts against server time, not the local clock", () => {
    // The client is two minutes behind the server: a deadline three server-minutes out must read
    // as three minutes, not five.
    const now = Date.now();
    observeServerTime({ serverEpochMs: now + 120_000, sentAt: now, receivedAt: now });
    const { result } = renderHook(() => useCountdown(serverNow() + 3 * 60_000));
    expect(Math.round((result.current.remainingMs ?? 0) / 1000)).toBe(180);
  });

  it("runs no timer for a null deadline and clears the timer on unmount", () => {
    const clear = vi.spyOn(globalThis, "clearInterval");
    const idle = renderHook(() => useCountdown(null));
    expect(idle.result.current.level).toBe("none");
    expect(vi.getTimerCount()).toBe(0);

    const live = renderHook(() => useCountdown(Date.now() + 60_000));
    expect(vi.getTimerCount()).toBe(1);
    live.unmount();
    expect(clear).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    idle.unmount();
    // The spy sits on the fake timer's global; leaving it installed removes `clearInterval`
    // from the environment when the fake timers are torn down.
    clear.mockRestore();
  });
});

describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility("visible");
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("polls on an interval while visible and stops when the tab is hidden", () => {
    const refresh = vi.fn<() => void>();
    const { unmount } = renderHook(() => usePolling(refresh, 5_000));
    expect(refresh).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(10_000); });
    expect(refresh).toHaveBeenCalledTimes(3);

    act(() => { setVisibility("hidden"); });
    refresh.mockClear();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(refresh).not.toHaveBeenCalled();

    // Returning to the tab refreshes immediately rather than waiting out the interval.
    act(() => { setVisibility("visible"); });
    expect(refresh).toHaveBeenCalledTimes(1);

    unmount();
    refresh.mockClear();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("runs no timer while disabled", () => {
    const refresh = vi.fn<() => void>();
    renderHook(() => usePolling(refresh, 5_000, false));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("skips a tick while the previous request is still in flight", async () => {
    let settle: (() => void) | undefined;
    const refresh = vi.fn<() => Promise<void>>(() => new Promise<void>((resolve) => { settle = resolve; }));
    renderHook(() => usePolling(refresh, 5_000));
    expect(refresh).toHaveBeenCalledTimes(1);

    // Three intervals elapse without the first request resolving: no request stacks behind it.
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => { settle?.(); });
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});

describe("usePolledRequest", () => {
  beforeEach(() => setVisibility("visible"));
  afterEach(() => cleanup());

  it("drops an older response that resolves after a newer one", async () => {
    const pending: Array<(value: string) => void> = [];
    const load = vi.fn<() => Promise<string>>(() => new Promise<string>((resolve) => pending.push(resolve)));
    const apply = vi.fn<(value: string) => void>();

    const { result } = renderHook(() => usePolledRequest(load, apply, 5_000));
    // The mount tick is in flight; force a second request past the in-flight guard.
    await act(async () => { void result.current.refresh(); });
    expect(pending).toHaveLength(2);

    // The NEWER request answers first, then the stale one lands.
    await act(async () => { pending[1]?.("fresh"); });
    await act(async () => { pending[0]?.("stale"); });

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith("fresh");
  });

  it("restarts against a new loader immediately and abandons the old request", async () => {
    const pending: Array<(value: string) => void> = [];
    const apply = vi.fn<(value: string) => void>();
    const first = vi.fn<() => Promise<string>>(() => new Promise<string>((resolve) => pending.push(resolve)));
    const second = vi.fn<() => Promise<string>>(() => new Promise<string>((resolve) => pending.push(resolve)));

    const { rerender } = renderHook(({ load }) => usePolledRequest(load, apply, 5_000), { initialProps: { load: first } });
    expect(first).toHaveBeenCalledTimes(1);

    // Navigating to another tournament must not wait out the interval.
    rerender({ load: second });
    expect(second).toHaveBeenCalledTimes(1);

    // The first tournament's answer arrives late and must not be shown on the second.
    await act(async () => { pending[0]?.("old tournament"); });
    expect(apply).not.toHaveBeenCalled();

    await act(async () => { pending[1]?.("new tournament"); });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith("new tournament");
  });

  it("aborts and ignores a response that lands after unmount", async () => {
    const pending: Array<(value: string) => void> = [];
    const signals: AbortSignal[] = [];
    const load = vi.fn<(signal: AbortSignal) => Promise<string>>((signal) => {
      signals.push(signal);
      return new Promise<string>((resolve) => pending.push(resolve));
    });
    const apply = vi.fn<(value: string) => void>();

    const { unmount } = renderHook(() => usePolledRequest(load, apply, 5_000));
    expect(signals[0]?.aborted).toBe(false);

    unmount();
    expect(signals[0]?.aborted).toBe(true);

    await act(async () => { pending[0]?.("after navigation"); });
    expect(apply).not.toHaveBeenCalled();
  });
});

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}
