// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnimationQueue } from "../animationQueue";
import { Side } from "../side";
import { cueFlights } from "./flights";
import { createPresentationGate, waitForGate } from "./presentationGate";
import type { DrawFlight, DrawHandArrival, MatchCueAnchors } from "./types";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function flightSequence(draw?: DrawHandArrival) {
  const log: string[] = [];
  let flights: readonly DrawFlight[] = [];
  const queue = createAnimationQueue();
  const precedingStrip = createPresentationGate();
  const laterEffect = createPresentationGate();
  const node = document.createElement("div");
  node.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100);
  const anchors: MatchCueAnchors = {
    board: { current: node },
    yourDeck: { current: node },
    oppDeck: { current: node },
    yourHandDock: { current: node },
    oppHandStrip: { current: node },
    yourSecurity: { current: node },
    oppSecurity: { current: node },
  };
  const { launchDrawFlight } = cueFlights({
    queue,
    anchors,
    viewerSeat: 0,
    presentationBatchRef: { current: { batchId: "draw-batch", stateVersion: 1 } },
    causingEffectGateRef: { current: null },
    securityGainKeyRef: { current: 0 },
    drawFlightKeyRef: { current: 0 },
    setSecurityFlights: () => {},
    setSecurityDealCounts: () => {},
    setDrawBursts: () => {},
    setHeldHandArrivals: () => {},
    setDrawFlights: (next) => {
      const updated = typeof next === "function" ? next(flights) : next;
      if (updated.length > flights.length) log.push("flight-start");
      if (updated.length < flights.length) log.push("flight-end");
      flights = updated;
    },
  });
  queue.enqueue({
    id: "stack-strip-peel-1",
    track: "stackStripPeel-host",
    side: Side.Opponent,
    async run(context) {
      await waitForGate(precedingStrip, context, 5000, "preceding-strip");
      log.push("preceding-strip-end");
    },
  });
  launchDrawFlight(Side.Opponent, false, 0, undefined, undefined, draw, 1);
  // A later clause waits for the earlier flight, as narrationStream does. Its peel
  // must not become a new prerequisite of that flight after the flight was queued.
  queue.enqueue({
    id: "later-effect",
    track: "narration",
    async run(context) {
      while (!context.cancelled && !context.skipping && queue.hasPendingStep((step) => step.id === "draw-flight-1"))
        await context.wait(16);
      log.push("later-effect");
      laterEffect.release();
    },
  });
  queue.enqueue({
    id: "stack-strip-peel-2",
    track: "stackStripPeel-host",
    side: Side.Opponent,
    async run(context) {
      await waitForGate(laterEffect, context, 5000, "later-strip");
      log.push("later-strip-end");
    },
  });
  return { queue, log, precedingStrip, laterEffect, flights: () => flights };
}

describe("draw flight source-peel ordering", () => {
  it.each([undefined, { stateVersion: 1, handCountAfter: 5, deckCountAfter: 45 } satisfies DrawHandArrival])(
    "waits for preceding peels without waiting for a later clause's peels (metadata=%j)",
    async (draw) => {
      const sequence = flightSequence(draw);
      await vi.advanceTimersByTimeAsync(32);
      expect(sequence.flights()).toHaveLength(0);
      expect(sequence.log).toEqual([]);

      sequence.precedingStrip.release();
      await vi.advanceTimersByTimeAsync(32);
      expect(sequence.flights()).toHaveLength(1);
      expect(sequence.log).toEqual(["preceding-strip-end", "flight-start"]);
      expect(sequence.laterEffect.open).toBe(false);

      await vi.advanceTimersByTimeAsync(1000);
      expect(sequence.log).toEqual([
        "preceding-strip-end",
        "flight-start",
        "flight-end",
        "later-effect",
        "later-strip-end",
      ]);
      expect(sequence.flights()).toHaveLength(0);
      expect(sequence.queue.isIdle()).toBe(true);
    },
  );

  it("fast-forwards the flight and both blocked peels without leaving pending cues", async () => {
    const sequence = flightSequence();
    await vi.advanceTimersByTimeAsync(32);
    expect(sequence.flights()).toHaveLength(0);

    sequence.queue.skip();
    await vi.advanceTimersByTimeAsync(32);
    expect(sequence.flights()).toHaveLength(0);
    expect(sequence.queue.isIdle()).toBe(true);
    expect(sequence.log).toContain("preceding-strip-end");
    expect(sequence.log).toContain("later-strip-end");
  });
});
