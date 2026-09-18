import { describe, expect, it } from "vitest";
import { createPresentationGate, waitForGate } from "./presentationGate";
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
    await waitForGate(gate, context({ skipping: true }), 5_000);
    expect(Date.now() - started).toBeLessThan(200);
    expect(gate.open).toBe(false);
  });

  it("waits for a gate that is still closed", async () => {
    const gate = createPresentationGate();
    const waited = waitForGate(gate, context({}), 5_000);
    setTimeout(() => gate.release(), 20);
    await waited;
    expect(gate.open).toBe(true);
  });
});
