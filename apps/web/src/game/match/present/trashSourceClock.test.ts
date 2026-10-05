// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAnimationQueue } from "../../animationQueue";
import { waitForTrashSourceClock } from "./trashSourceClock";

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe("trash preparation and visual completion", () => {
  it("begins reading at the painted 750ms boundary while the 80ms shrink retains its owner", async () => {
    vi.useFakeTimers();
    const card = document.createElement("div");
    card.className = "game-pile__effect-card";
    card.dataset.activationKey = "2";
    document.body.append(card);
    let clock = 700;
    const animation: Pick<CSSAnimation, "animationName" | "currentTime" | "playState"> = {
      animationName: "battle-effect-trash-activation",
      get currentTime() {
        return clock;
      },
      playState: "running",
    };
    Object.defineProperty(card, "getAnimations", { value: () => [animation] });
    const queue = createAnimationQueue();
    let reading = false;
    let complete = false;
    queue.enqueue({
      id: "trash",
      track: "source",
      async run(context) {
        await waitForTrashSourceClock(2, 750, context);
        reading = true;
        await waitForTrashSourceClock(2, 830, context);
        complete = true;
      },
    });
    await vi.advanceTimersByTimeAsync(16);
    expect(reading).toBe(false);
    clock = 750;
    await vi.advanceTimersByTimeAsync(16);
    expect(reading).toBe(true);
    expect(complete).toBe(false);
    clock = 830;
    await vi.advanceTimersByTimeAsync(16);
    expect(complete).toBe(true);
    expect(queue.isIdle()).toBe(true);
  });
});
