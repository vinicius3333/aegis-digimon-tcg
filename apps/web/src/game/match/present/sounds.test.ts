import { describe, expect, it, vi } from "vitest";
import type { AnimationStep, AnimationStepContext } from "../../animationQueue";
import { enqueueBatchSounds } from "./sounds";

describe("receipt fallback audio", () => {
  it("leaves live play to painted presentations, sounds reduced motion, and drops replay/skip", async () => {
    const steps: AnimationStep[] = [];
    const playCue = vi.fn<(kind: string) => void>();
    enqueueBatchSounds({
      fresh: [{ kind: "cardPlayed", seat: 1, cardId: "BT1-010" }],
      viewerSeat: 0,
      batchId: "b1",
      enqueue: (step) => steps.push(step),
      playCue,
    });
    const step = steps[0]!;
    const context = (mode: string, skipping = false) => ({ mode, skipping, cancelled: false }) as AnimationStepContext;
    await step.run(context("live"));
    expect(playCue).not.toHaveBeenCalled();
    await step.run(context("reduced"));
    expect(playCue).toHaveBeenCalledExactlyOnceWith("cardPlay");
    await step.run(context("replay"));
    await step.run(context("live", true));
    expect(playCue).toHaveBeenCalledTimes(1);
  });
  it("retains terminal result and reserves turn handover for its banner", async () => {
    const steps: AnimationStep[] = [];
    const playCue = vi.fn<(kind: string) => void>();
    enqueueBatchSounds({
      fresh: [
        { kind: "turnEnded", endingSeat: 0, nextSeat: 1, turnCount: 2 },
        { kind: "gameOver", result: { outcome: "win", winnerSeat: 0 }, reason: "security" },
      ],
      viewerSeat: 0,
      batchId: "b2",
      enqueue: (step) => steps.push(step),
      playCue,
    });
    expect(steps).toHaveLength(1);
    await steps[0]!.run({ mode: "live", cancelled: false, skipping: false } as AnimationStepContext);
    expect(playCue).toHaveBeenCalledExactlyOnceWith("win");
  });
  it("sounds blocks and accepted protection live, since no painted scene voices them", async () => {
    const steps: AnimationStep[] = [];
    const playCue = vi.fn<(kind: string) => void>();
    enqueueBatchSounds({
      fresh: [
        { kind: "blocked", blockerPermanentId: "p2" },
        { kind: "barrierResolved", permanentId: "p2", accepted: true },
        { kind: "evadeResolved", permanentId: "p3", accepted: false },
      ],
      viewerSeat: 0,
      batchId: "b3",
      enqueue: (step) => steps.push(step),
      playCue,
    });
    expect(steps).toHaveLength(2);
    for (const step of steps)
      await step.run({ mode: "live", cancelled: false, skipping: false } as AnimationStepContext);
    expect(playCue.mock.calls).toEqual([["block"], ["protect"]]);
  });
});
