// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import type { AnimationStepContext } from "../animationQueue";
import { waitForDrawPresentationClock } from "./drawPresentationClock";

afterEach(() => {
  document.querySelectorAll("[data-draw-presentation-key]").forEach((root) => root.remove());
});

function presentation() {
  const root = document.createElement("div");
  root.dataset.drawPresentationKey = "7";
  root.dataset.drawReady = "false";
  const face = document.createElement("div");
  face.className = "game-draw-presentation__face";
  root.append(face);
  document.body.append(root);
  return { root, face };
}

it("preserves the whole painted preparation after late image readiness", async () => {
  const { root, face } = presentation();
  let age = 0;
  let waits = 0;
  face.getAnimations = () => [
    {
      animationName: "battle-draw-presentation-viewer",
      currentTime: age,
      playState: "paused",
      playbackRate: 1,
      effect: { getTiming: () => ({ delay: 0 }) },
    } as unknown as Animation,
  ];
  const context: AnimationStepContext = {
    mode: "live",
    cancelled: false,
    skipping: false,
    async wait(ms) {
      waits++;
      if (root.dataset.drawReady === "true") age += ms;
      if (waits === 4) root.dataset.drawReady = "true";
    },
  };
  await waitForDrawPresentationClock(7, 210, context);
  expect(age).toBeGreaterThanOrEqual(210);
  expect(waits).toBeGreaterThan(14);
});

it("cancels an image wait instead of spending its loading ceiling", async () => {
  presentation();
  let cancelled = false;
  let waits = 0;
  const context: AnimationStepContext = {
    mode: "live",
    get cancelled() {
      return cancelled;
    },
    skipping: false,
    async wait() {
      waits++;
      cancelled = true;
    },
  };
  await waitForDrawPresentationClock(7, 210, context);
  expect(waits).toBe(1);
});

it.each(["drain", "replay"] as const)("does not hold a decoded presentation in %s mode", async (mode) => {
  presentation();
  let waits = 0;
  await waitForDrawPresentationClock(7, 210, {
    mode,
    cancelled: false,
    skipping: false,
    async wait() {
      waits++;
    },
  });
  expect(waits).toBe(0);
});
