import { describe, expect, it, vi } from "vitest";
import { createAnimationQueue } from "../../animationQueue";
import { createPresentationGate } from "../presentationGate";
import { enqueueSecurityDestructions } from "./securityDestructions";

describe("effect-caused security destruction", () => {
  it("waits for the source effect's toast before breaking the security stack", async () => {
    const queue = createAnimationQueue();
    const effectAnnounced = createPresentationGate();
    const setSecurityBreak = vi.fn<(value: unknown) => void>();
    const setSecurityClash = vi.fn<(value: unknown) => void>();
    const noop = () => {};
    enqueueSecurityDestructions({
      fresh: [
        { kind: "cardsMoved", from: "security", to: "trash", seat: 1, instanceIds: ["top"], cardIds: ["BT1-020"] },
      ],
      viewerSeat: 0,
      replayingHistory: false,
      queue,
      sidePanelLookupRef: { current: { cardId: () => undefined, seat: () => undefined } },
      securityClashKeyRef: { current: 0 },
      pendingDestructionsRef: { current: 0 },
      setSecurityBreak,
      setSecurityHitSeat: noop,
      setSecurityClash,
      setPendingRevealKey: noop,
      securityCountOf: () => 5,
      holdSecurityCard: noop,
      releaseSecurityCard: noop,
      releaseSecurityCardWhenIdle: noop,
      releaseSecurityPresentation: noop,
      causingEffectGate: effectAnnounced,
      enqueue: (step) => queue.enqueue(step),
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(setSecurityBreak).not.toHaveBeenCalled();
    expect(setSecurityClash).not.toHaveBeenCalled();
    effectAnnounced.release();
    await vi.waitFor(() => expect(setSecurityBreak).toHaveBeenCalled());
    queue.clear();
  });
});
