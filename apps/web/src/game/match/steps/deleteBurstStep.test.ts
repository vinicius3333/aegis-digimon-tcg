import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createAnimationQueue } from "../../animationQueue";
import { createPresentationGate } from "../presentationGate";
import { deleteBurstStep } from "./deleteBurstStep";
import type { DeleteBurst } from "../types";
import type { DeletionReadyAt } from "../presentationGate";
import { holdsTheBoard } from "../tracks";
import { TIMINGS } from "../../timings";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("measures the held face at departure, releases the shatter at 250ms and keeps only non-blocking light", async () => {
  const queue = createAnimationQueue();
  const gate = createPresentationGate();
  const release = vi.fn<() => void>();
  let bursts: readonly DeleteBurst[] = [];
  const ready = { current: new Map<string, DeletionReadyAt>() };
  const face = vi.fn<() => { x: number; y: number; width: number; height: number; angle: number }>(() => ({
    x: 200,
    y: 300,
    width: 116,
    height: 162,
    angle: 90,
  }));
  const step = deleteBurstStep({
    queue,
    key: 1,
    anchors: {
      permanentCenter: () => ({ x: 100, y: 100 }),
      permanentFace: face,
      board: { current: null },
      yourDeck: { current: null },
      oppDeck: { current: null },
      yourHandDock: { current: null },
      oppHandStrip: { current: null },
      yourSecurity: { current: null },
      oppSecurity: { current: null },
    },
    anchorId: "target",
    metadataCardId: "BT1-020",
    effectDeletion: true,
    deletionReadyAtRef: ready,
    metadataSeat: 0,
    securityBlowRef: { current: null },
    causingEffectGate: gate,
    readBeforeBreak: false,
    releaseHeldDeletion: release,
    setDeleteBursts: (update) => {
      bursts = typeof update === "function" ? update(bursts) : update;
    },
  })!;
  queue.enqueue(step);
  await vi.advanceTimersByTimeAsync(0);
  expect(bursts).toHaveLength(0);
  expect(release).not.toHaveBeenCalled();
  expect(face).not.toHaveBeenCalled();
  gate.release();
  await vi.advanceTimersByTimeAsync(0);
  expect(face).toHaveBeenCalledOnce();
  expect(bursts[0]).toMatchObject({ x: 142, y: 219, face: { width: 116, height: 162, angle: 90 } });
  await vi.advanceTimersByTimeAsync(249);
  const arrival = ready.current.get("0:BT1-020") as DeletionReadyAt;
  expect(arrival.shattered!.open).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(arrival.shattered!.open).toBe(true);
  expect(queue.hasPendingStep(holdsTheBoard)).toBe(false);
  expect(bursts).toHaveLength(1);
  expect(release).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(TIMINGS.cardBurst - TIMINGS.deletionBurst);
  expect(bursts).toHaveLength(0);
  expect(queue.isIdle()).toBe(true);
});

it.each(["discard", "cancel-shards", "skip-shards", "cancel-light", "skip-light"])(
  "%s releases the physical card, gates and any remaining decoration",
  async (caseName) => {
    const queue = createAnimationQueue();
    if (caseName === "discard") queue.pause();
    const ready = { current: new Map<string, DeletionReadyAt>() };
    const release = vi.fn<() => void>();
    let bursts: readonly DeleteBurst[] = [];
    const step = deleteBurstStep({
      queue,
      key: 8,
      anchorId: "target",
      metadataCardId: "BT1-020",
      metadataSeat: 0,
      anchors: {
        permanentCenter: () => ({ x: 80, y: 90 }),
        board: { current: null },
        yourDeck: { current: null },
        oppDeck: { current: null },
        yourHandDock: { current: null },
        oppHandStrip: { current: null },
        yourSecurity: { current: null },
        oppSecurity: { current: null },
      },
      deletionReadyAtRef: ready,
      securityBlowRef: { current: null },
      causingEffectGate: null,
      releaseHeldDeletion: release,
      setDeleteBursts: (update) => {
        bursts = typeof update === "function" ? update(bursts) : update;
      },
    })!;
    queue.enqueue(step);
    await vi.advanceTimersByTimeAsync(caseName.includes("light") ? 300 : 0);
    if (caseName.startsWith("skip")) queue.skip();
    else queue.clear();
    await vi.advanceTimersByTimeAsync(0);
    expect(release).toHaveBeenCalledOnce();
    expect(ready.current.get("0:BT1-020")!.started!.open).toBe(true);
    expect(ready.current.get("0:BT1-020")!.shattered!.open).toBe(true);
    expect(bursts).toHaveLength(0);
    expect(queue.isIdle()).toBe(true);
  },
);
