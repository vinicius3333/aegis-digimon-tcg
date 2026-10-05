// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { GameState } from "@aegis/shared";
import { createAnimationQueue } from "../../animationQueue";
import type { DpPulse } from "../../dpPulse";
import { createPresentationGate } from "../presentationGate";
import { useDpPulses } from "./useDpPulses";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function board(currentDP: number, stateVersion: number): GameState {
  return {
    stateVersion,
    players: [{ battleArea: [] }, { battleArea: [{ permanentId: "opponent", currentDP }] }],
  } as unknown as GameState;
}

function harness() {
  const queue = createAnimationQueue();
  const gate = createPresentationGate();
  const dpByPermanentRef = { current: null as Map<string, number> | null };
  const dpPulseKeyRef = { current: 0 };
  const stackStripKeyRef = { current: 0 };
  const view = renderHook(
    ({ state }) => {
      const [pulses, setDpPulses] = useState<ReadonlyMap<string, DpPulse>>(new Map());
      const [suppressions, setDpBadgeSuppressions] = useState<ReadonlyMap<string, number>>(new Map());
      useDpPulses({
        state,
        queue,
        dpByPermanentRef,
        dpPulseKeyRef,
        stackStripKeyRef,
        causingEffectGateRef: { current: gate },
        setDpPulses,
        setDpBadgeSuppressions,
      });
      return { pulses, suppressions };
    },
    { initialProps: { state: board(12000, 1) } },
  );
  return { ...view, queue, gate, stackStripKeyRef };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

it("waits for a same-revision source receipt arriving after the DP patch, excluding future costs", async () => {
  const view = harness();
  view.rerender({ state: board(8000, 2) });
  expect(view.result.current.suppressions.has("opponent")).toBe(true);
  let futureStarted = false;
  act(() => {
    view.stackStripKeyRef.current = 2;
    view.queue.enqueue({
      id: "stack-strip-peel-1",
      track: "stackStripPeel",
      origin: { batchId: "cost", stateVersion: 2 },
      run: async (context) => {
        await context.wait(300);
      },
    });
    view.queue.enqueue({
      id: "stack-strip-peel-2",
      track: "stackStripPeel",
      origin: { batchId: "future-cost", stateVersion: 3 },
      run: async (context) => {
        futureStarted = true;
        await context.wait(3000);
      },
    });
    view.gate.release();
  });
  await advance(280);
  expect(view.result.current.pulses.size).toBe(0);
  await advance(48);
  expect(futureStarted).toBe(true);
  expect(view.result.current.pulses.get("opponent")).toMatchObject({ from: 12000, to: 8000 });
  await advance(5000);
  expect(view.result.current.pulses.size).toBe(0);
  expect(view.result.current.suppressions.size).toBe(0);
  expect(view.queue.isIdle()).toBe(true);
});

it.each(["skip", "clear"] as const)("releases DP suppression when %s interrupts its cause wait", async (action) => {
  const view = harness();
  view.rerender({ state: board(0, 2) });
  expect(view.result.current.suppressions.size).toBe(1);
  act(() => view.queue[action]());
  await advance(32);
  expect(view.result.current.pulses.size).toBe(0);
  expect(view.result.current.suppressions.size).toBe(0);
  expect(view.queue.isIdle()).toBe(true);
});

it("cleans a queued DP pulse discarded before it starts while paused", async () => {
  const view = harness();
  act(() => view.queue.pause());
  view.rerender({ state: board(8000, 2) });
  expect(view.result.current.suppressions.size).toBe(1);
  act(() => view.queue.clear());
  await advance(32);
  expect(view.result.current.suppressions.size).toBe(0);
  expect(view.queue.isIdle()).toBe(true);
});
