// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnimationQueue } from "../../animationQueue";
import { buildSecurityRevealScene, type SecurityClashScene } from "../../securityClash";
import { exitSecurityCard } from "./securityCardExit";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

function paintedExit(shatter = false) {
  const root = document.createElement("div");
  root.className = "battle-clash";
  root.dataset.sceneKey = "1";
  root.dataset.exiting = "true";
  root.innerHTML =
    '<figure class="battle-clash__card" data-role="revealed"><div class="battle-clash__art"></div></figure>';
  document.body.append(root);
  let playState: AnimationPlayState = "running";
  const animation: Pick<CSSAnimation, "animationName" | "playState"> = {
    animationName: "battle-security-exit",
    get playState() {
      return playState;
    },
  };
  Object.defineProperty(root.querySelector(".battle-clash__art"), "getAnimations", { value: () => [animation] });
  let fragmentState: AnimationPlayState = "running";
  Object.defineProperty(root, "getAnimations", {
    value: () =>
      shatter
        ? [
            {
              animationName: "battle-card-shatter",
              get playState() {
                return fragmentState;
              },
            },
          ]
        : [],
  });
  const queue = createAnimationQueue();
  let scene: SecurityClashScene | null = buildSecurityRevealScene({
    key: 1,
    revealedCardId: "BT1-010",
    defenderSeat: 1,
    viewerSeat: 0,
  });
  let finished = false;
  queue.enqueue({
    id: "exit",
    track: "centre",
    async run(context) {
      try {
        await exitSecurityCard({
          key: 1,
          shatter,
          context,
          setSecurityClash(update) {
            scene = typeof update === "function" ? update(scene) : update;
          },
        });
      } finally {
        scene = null;
        finished = true;
      }
    },
  });
  return {
    queue,
    get scene() {
      return scene;
    },
    get finished() {
      return finished;
    },
    completeShatter() {
      fragmentState = "finished";
    },
    complete() {
      playState = "finished";
    },
  };
}

describe("painted security exit ownership", () => {
  it("keeps the card mounted after queue time until its CSS animation completes", async () => {
    const exit = paintedExit();
    await vi.advanceTimersByTimeAsync(140);
    expect(exit.scene?.exiting).toBe(true);
    expect(exit.finished).toBe(false);
    expect(exit.queue.isIdle()).toBe(false);
    exit.complete();
    await vi.advanceTimersByTimeAsync(16);
    expect(exit.scene).toBeNull();
    expect(exit.finished).toBe(true);
    expect(exit.queue.isIdle()).toBe(true);
  });

  it("releases the remaining CSS wait when the queue is cancelled", async () => {
    const exit = paintedExit();
    await vi.advanceTimersByTimeAsync(140);
    exit.queue.clear();
    await vi.advanceTimersByTimeAsync(0);
    expect(exit.scene).toBeNull();
    expect(exit.queue.isIdle()).toBe(true);
  });

  it("freezes its remaining ownership while playback is paused", async () => {
    const exit = paintedExit();
    await vi.advanceTimersByTimeAsync(140);
    exit.queue.pause();
    exit.complete();
    await vi.advanceTimersByTimeAsync(10000);
    expect(exit.finished).toBe(false);
    exit.queue.resume();
    await vi.advanceTimersByTimeAsync(16);
    expect(exit.scene).toBeNull();
    expect(exit.queue.isIdle()).toBe(true);
  });

  it("drains a decorative exit without waiting on a frozen CSS clock", async () => {
    const exit = paintedExit();
    await vi.advanceTimersByTimeAsync(140);
    exit.queue.setMode("drain");
    await vi.advanceTimersByTimeAsync(16);
    expect(exit.scene).toBeNull();
    expect(exit.queue.isIdle()).toBe(true);
  });
});

describe("losing attacker fracture ownership", () => {
  it("keeps the attacker after the 140ms checked-card disposal through all 250ms of fracture", async () => {
    const exit = paintedExit(true);
    exit.complete();
    await vi.advanceTimersByTimeAsync(250);
    expect(exit.finished).toBe(false);
    exit.completeShatter();
    await vi.advanceTimersByTimeAsync(16);
    expect(exit.finished).toBe(true);
    expect(exit.queue.isIdle()).toBe(true);
  });

  it.each(["clear", "drain", "skip"])("releases remaining fragment ownership on %s", async (action) => {
    const exit = paintedExit(true);
    exit.complete();
    await vi.advanceTimersByTimeAsync(250);
    if (action === "clear") exit.queue.clear();
    if (action === "drain") exit.queue.setMode("drain");
    if (action === "skip") exit.queue.skip();
    await vi.advanceTimersByTimeAsync(16);
    expect(exit.finished).toBe(true);
    expect(exit.scene).toBeNull();
    expect(exit.queue.isIdle()).toBe(true);
  });

  it("keeps a paused fracture owned until resume", async () => {
    const exit = paintedExit(true);
    exit.complete();
    await vi.advanceTimersByTimeAsync(250);
    exit.queue.pause();
    exit.completeShatter();
    await vi.advanceTimersByTimeAsync(10000);
    expect(exit.finished).toBe(false);
    exit.queue.resume();
    await vi.advanceTimersByTimeAsync(16);
    expect(exit.finished).toBe(true);
  });
});
