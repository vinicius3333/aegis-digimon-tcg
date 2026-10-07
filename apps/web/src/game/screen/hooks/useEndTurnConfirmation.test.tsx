// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Phase } from "@aegis/shared";
import { useEndTurnConfirmation } from "./useEndTurnConfirmation";

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const props = () => ({ phase: Phase.Main, turnCount: 1, blocked: false, onEndPhase: vi.fn<() => void>() });

it("requires confirmation, cancels safely, and sends only one pass for a double tap", () => {
  const p = props();
  const { result } = renderHook(() => useEndTurnConfirmation(p));
  act(() => result.current.request());
  expect(result.current.open).toBe(true);
  expect(p.onEndPhase).not.toHaveBeenCalled();
  act(() => result.current.cancel());
  expect(result.current.open).toBe(false);
  act(() => result.current.request());
  act(() => {
    result.current.confirm();
    result.current.confirm();
  });
  expect(p.onEndPhase).toHaveBeenCalledTimes(1);
});

it("remembers opting out only after confirming, including after remount", () => {
  const p = props();
  const first = renderHook(() => useEndTurnConfirmation(p));
  act(() => first.result.current.request());
  act(() => first.result.current.confirm(true));
  first.unmount();
  const next = renderHook(() => useEndTurnConfirmation(p));
  act(() => {
    next.result.current.request();
    next.result.current.request();
  });
  expect(next.result.current.open).toBe(false);
  expect(p.onEndPhase).toHaveBeenCalledTimes(2);
});

it("does not remember opting out from a stale confirmation", () => {
  const p = props();
  const { result, rerender } = renderHook(useEndTurnConfirmation, { initialProps: p });
  act(() => result.current.request());
  rerender({ ...p, turnCount: 2, blocked: true });
  expect(result.current.open).toBe(false);
  act(() => result.current.confirm(true));
  expect(p.onEndPhase).not.toHaveBeenCalled();
  expect(localStorage.getItem("aegis.skip-end-turn-confirmation")).toBeNull();
  // A new turn needs a fresh question.
  rerender({ ...p, turnCount: 3 });
  expect(result.current.open).toBe(false);
  act(() => result.current.request());
  expect(result.current.open).toBe(true);
});

it("dismisses the question when a decision blocks the board and never reopens it automatically", () => {
  const p = props();
  const { result, rerender } = renderHook(useEndTurnConfirmation, { initialProps: p });
  act(() => result.current.request());
  rerender({ ...p, blocked: true });
  rerender(p);
  expect(result.current.open).toBe(false);
  act(() => result.current.confirm());
  expect(p.onEndPhase).not.toHaveBeenCalled();
});

it("ends the breeding step immediately without a turn confirmation", () => {
  const p = { ...props(), phase: Phase.Breeding };
  const { result } = renderHook(() => useEndTurnConfirmation(p));
  act(() => result.current.request());
  expect(result.current.open).toBe(false);
  expect(p.onEndPhase).toHaveBeenCalledTimes(1);
});
