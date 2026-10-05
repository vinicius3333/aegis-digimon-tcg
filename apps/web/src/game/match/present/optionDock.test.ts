import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnimationQueue } from "../../animationQueue";
import type { SecurityBranchScene } from "../../securityClash";
import { enqueueOptionDock, type OptionDockHold } from "./optionDock";
import { waitForGate } from "../presentationGate";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("Option execution slot disposal", () => {
  it.each([
    "zone-change",
    "reveal-showcase",
    "draw-flight",
    "deck-under-flight",
    "deck-return",
    "security-gain-flight",
  ])("keeps its source while an owned %s result is running and releases later narration", async (resultKind) => {
    const queue = createAnimationQueue();
    const dockRef = { current: null as OptionDockHold | null };
    let shown: SecurityBranchScene | null = null;
    let resultFinished = false;
    let laterShown = false;
    queue.enqueue({
      id: `${resultKind}-1`,
      origin: { batchId: "option", stateVersion: 1 },
      track: "result",
      async run(context) {
        await context.wait(2000);
        resultFinished = true;
      },
    });
    enqueueOptionDock({
      queue,
      stateVersion: 1,
      usedOption: { kind: "cardPlayed", seat: 0, cardId: "BT1-090" },
      optionRouted: true,
      routedUnderPermanentId: undefined,
      viewerSeat: 0,
      optionDockKeyRef: { current: 0 },
      optionDockRef: dockRef,
      decisionPendingRef: { current: false },
      setOptionBranch(update) {
        shown = typeof update === "function" ? update(shown) : update;
      },
      flyDockedOptionUnder: async () => false,
      releaseTrashArrivalsThrough: () => {},
      enqueue: (step) => queue.enqueue({ ...step, origin: { batchId: "option", stateVersion: 1 } }),
    });
    const settled = dockRef.current!.settled;
    queue.enqueue({
      id: "narration-step-later",
      origin: { batchId: "after-option", stateVersion: 2 },
      track: "later",
      async run(context) {
        await waitForGate(settled, context, 5000, "test/laterOptionClause");
        laterShown = true;
      },
    });
    await vi.advanceTimersByTimeAsync(1500);
    expect(resultFinished).toBe(false);
    expect(shown).toMatchObject({ state: "docked" });
    expect(settled.open).toBe(false);
    expect(laterShown).toBe(false);
    await vi.advanceTimersByTimeAsync(620);
    expect(resultFinished).toBe(true);
    expect(shown).toBeNull();
    expect(settled.open).toBe(true);
    expect(laterShown).toBe(true);
    expect(queue.isIdle()).toBe(true);
    queue.clear();
  });
});
