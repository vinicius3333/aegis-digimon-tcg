// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { waitForPaintedAnimation } from "./paintedAnimationClock";
import type { AnimationStepContext } from "./animationQueue";

afterEach(() => {
  vi.restoreAllMocks();
});

it.each([1, 2, 4])("retains the painted particle finish at %sx queue playback", async (speed) => {
  let age = 0,
    now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const animation = {
    animationName: "battle-particle-clock",
    playState: "running",
    currentTime: 0,
    effect: { getTiming: () => ({ delay: 0 }) },
  };
  const root = document.createElement("span");
  root.getAnimations = () => [animation as unknown as Animation];
  const context = {
    mode: "live",
    cancelled: false,
    skipping: false,
    wait: async (ms: number) => {
      now += ms / speed;
      age += ms / speed;
      animation.currentTime = age;
    },
  } as AnimationStepContext;
  await waitForPaintedAnimation(() => root, "battle-particle-clock", 1150, context);
  expect(age).toBeGreaterThanOrEqual(1150);
  expect(age).toBeLessThan(1167);
});

it.each(["cancel", "skip", "replay"])("releases a stopped light on %s", async (mode) => {
  const root = document.createElement("span");
  root.getAnimations = () => [
    {
      animationName: "battle-particle-clock",
      currentTime: 20,
      playState: "running",
      effect: { getTiming: () => ({ delay: 0 }) },
    } as unknown as Animation,
  ];
  const context = {
    mode: "live",
    cancelled: false,
    skipping: false,
    wait: vi.fn<() => Promise<void>>(async () => {
      if (mode === "cancel") context.cancelled = true;
      if (mode === "skip") context.skipping = true;
      if (mode === "replay") context.mode = "replay";
    }),
  };
  await waitForPaintedAnimation(() => root, "battle-particle-clock", 1150, context as AnimationStepContext);
  expect(context.wait).toHaveBeenCalledOnce();
});
