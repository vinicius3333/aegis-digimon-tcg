import { describe, expect, it } from "vitest";
import { createPresentationGate, observeGateExpiry, waitForGate } from "./presentationGate";
import type { AnimationStepContext } from "../animationQueue";

/* A gate is the one wait with no clock of its own, so a fast-forward has to break it —
   otherwise the skip releases every timed beat and the queue sits on this one until the
   ceiling runs out (the security-check freeze waited 45s on a blow that never landed). */
describe("waitForGate", () => {
  const context = (over: Partial<AnimationStepContext>): AnimationStepContext =>
    ({
      mode: "live",
      cancelled: false,
      skipping: false,
      wait: async () => {},
      ...over,
    }) as AnimationStepContext;

  it("returns at once while the presentation is being fast-forwarded", async () => {
    const gate = createPresentationGate();
    const started = Date.now();
    expect(await waitForGate(gate, context({ skipping: true }), 5_000, "test/skip")).toBe("skipped");
    expect(Date.now() - started).toBeLessThan(200);
    expect(gate.open).toBe(false);
  });

  it("waits for a gate that is still closed", async () => {
    const gate = createPresentationGate();
    const waited = waitForGate(gate, context({}), 5_000, "test/closed");
    setTimeout(() => gate.release(), 20);
    expect(await waited).toBe("released");
    expect(gate.open).toBe(true);
  });

  /* The ceiling is a safety net over a beat somebody forgot to hand over, so it reports
     itself rather than passing for an ordinary wait: a stall nobody hears about is the
     one that reaches a player. */
  it("reports the label of a gate that ran out its ceiling", async () => {
    const seen: string[] = [];
    const stop = observeGateExpiry(({ label, ceilingMs }) => seen.push(`${label}@${ceilingMs}`));
    try {
      expect(await waitForGate(createPresentationGate(), context({}), 40, "test/abandoned")).toBe("expired");
    } finally {
      stop();
    }
    expect(seen).toEqual(["test/abandoned@40"]);
  });

  it("stops reporting once the observer unsubscribes", async () => {
    const seen: string[] = [];
    observeGateExpiry(({ label }) => seen.push(label))();
    await waitForGate(createPresentationGate(), context({}), 40, "test/unobserved");
    expect(seen).toEqual([]);
  });
});
