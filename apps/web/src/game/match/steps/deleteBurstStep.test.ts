import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createAnimationQueue } from "../../animationQueue";
import { createPresentationGate } from "../presentationGate";
import { deleteBurstStep } from "./deleteBurstStep";
import type { DeleteBurst } from "../types";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("finishes a live effect deletion within 400ms after its cause is ready", async () => {
  const queue = createAnimationQueue();
  const gate = createPresentationGate();
  const release = vi.fn<() => void>();
  let bursts: readonly DeleteBurst[] = [];
  const step = deleteBurstStep({
    queue,
    key: 1,
    anchors: {
      permanentCenter: () => ({ x: 100, y: 100 }),
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
    deletionReadyAtRef: { current: new Map() },
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
  gate.release();
  await vi.advanceTimersByTimeAsync(400);
  expect(release).toHaveBeenCalledOnce();
  expect(bursts).toHaveLength(0);
  expect(queue.isIdle()).toBe(true);
});
