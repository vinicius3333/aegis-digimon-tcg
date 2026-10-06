// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import type { AnimationStepContext } from "../../animationQueue";
import { waitForCombatImpactClock } from "./combatImpactClock";

const originalTimeline = Object.getOwnPropertyDescriptor(document, "timeline");
afterEach(() => {
  document.body.replaceChildren();
  if (originalTimeline) Object.defineProperty(document, "timeline", originalTimeline);
  else Reflect.deleteProperty(document, "timeline");
});
function impact(initialRate = 1, changeTo?: number) {
  let rate = initialRate;
  let now = 300 / rate;
  let start = 0;
  const root = document.createElement("div");
  root.dataset.combatImpact = "true";
  root.dataset.permanentId = "loser";
  document.body.append(root);
  Object.defineProperty(document, "timeline", {
    configurable: true,
    value: {
      get currentTime() {
        return now;
      },
    },
  });
  root.getAnimations = vi.fn<() => Animation[]>(() => [
    {
      animationName: "battle-claw",
      startTime: start,
      playbackRate: rate,
      currentTime: 250,
      playState: "finished",
      effect: { getTiming: () => ({ delay: 0 }) },
    } as unknown as Animation,
  ]);
  const context: AnimationStepContext = {
    mode: "live",
    cancelled: false,
    skipping: false,
    wait: vi.fn<AnimationStepContext["wait"]>(async (ms: number) => {
      if (changeTo !== undefined) {
        const age = (now - start) * rate;
        rate = changeTo;
        start = now - age / rate;
        changeTo = undefined;
      }
      now += ms / rate;
    }),
  };
  return context;
}
it("retains the painted 100ms settle after CSS has clamped at250", async () => {
  const context = impact();
  await waitForCombatImpactClock(["loser"], context);
  expect(context.wait).toHaveBeenCalledTimes(4);
});
it.each([0.5, 2])("keeps the same local settle at %sx playback speed", async (rate) => {
  const context = impact(rate);
  await waitForCombatImpactClock(["loser"], context);
  expect(context.wait).toHaveBeenCalledTimes(4);
});
it("retains local age when playback speed changes during settle", async () => {
  const context = impact(0.5, 2);
  await waitForCombatImpactClock(["loser"], context);
  expect(context.wait).toHaveBeenCalledTimes(4);
});
it("does not wait on another physical permanent", async () => {
  const context = impact();
  await waitForCombatImpactClock(["other"], context);
  expect(context.wait).not.toHaveBeenCalled();
});
it.each(["replay", "drain"] as const)("collapses the %s impact", async (mode) => {
  const context = impact();
  await waitForCombatImpactClock(["loser"], { ...context, mode });
  expect(context.wait).not.toHaveBeenCalled();
});
it("stops a cancelled painted hold", async () => {
  const context = impact();
  let cancelled = false;
  const wait = vi.fn<AnimationStepContext["wait"]>(async () => {
    cancelled = true;
  });
  await waitForCombatImpactClock(["loser"], {
    ...context,
    wait,
    get cancelled() {
      return cancelled;
    },
  });
  expect(wait).toHaveBeenCalledTimes(1);
});
