// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createLiveMotionProbe } from "./liveMotionProbe";

afterEach(() => vi.restoreAllMocks());

it("excludes hidden time even when the browser suspends every hidden frame", () => {
  let nextFrame: FrameRequestCallback = () => {};
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    nextFrame = callback;
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  const now = vi.spyOn(window.performance, "now").mockReturnValue(0);
  const probe = createLiveMotionProbe();
  probe.start();
  nextFrame(0);
  nextFrame(16);
  now.mockReturnValue(16);
  visibility.mockReturnValue("hidden");
  document.dispatchEvent(new Event("visibilitychange"));
  // No rAF runs during the entire background interval.
  now.mockReturnValue(10_016);
  visibility.mockReturnValue("visible");
  document.dispatchEvent(new Event("visibilitychange"));
  nextFrame(10_016);
  nextFrame(10_032);
  probe.stop();
  expect(probe.read()).toMatchObject({ hiddenMs: 10_000, frames: { maxMs: 16 }, captureQuality: "usable" });
  visibility.mockReturnValue("hidden");
  document.dispatchEvent(new Event("visibilitychange"));
  now.mockReturnValue(20_016);
  visibility.mockReturnValue("visible");
  document.dispatchEvent(new Event("visibilitychange"));
  expect(probe.read().hiddenMs).toBe(10_000);
});

it("observes a painted card through boxless layout ancestors while respecting hidden parents", () => {
  const computedStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
    const style = computedStyle(element, pseudo);
    // jsdom leaves the initial opacity empty; browsers resolve it to one.
    if (style.opacity === "") style.opacity = "1";
    return style;
  });
  let nextFrame: FrameRequestCallback = () => {};
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    nextFrame = callback;
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const wrapper = document.createElement("div");
  wrapper.style.display = "contents";
  const card = document.createElement("div");
  card.getBoundingClientRect = () => new DOMRect(10, 10, 100, 140);
  wrapper.append(card);
  document.body.append(wrapper);
  let age = 0;
  const animation = {
    currentTime: 0,
    playState: "running",
    effect: { target: card, getComputedTiming: () => ({ activeDuration: 200, iterations: 1, endTime: 200 }) },
  };
  Object.defineProperty(document, "getAnimations", { configurable: true, value: () => [animation] });
  const probe = createLiveMotionProbe();
  try {
    probe.start();
    nextFrame(0);
    age += 16;
    animation.currentTime = age;
    card.style.transform = "scale(1.05)";
    nextFrame(age);
    const sample = probe.read().animations[0]!;
    expect(sample.visibleFrames).toBe(2);
    expect(sample.movingFrames).toBe(1);
    wrapper.style.opacity = "0";
    animation.currentTime = 32;
    card.style.transform = "scale(1.1)";
    nextFrame(32);
    expect(sample.visibleFrames).toBe(2);
    expect(sample.movingFrames).toBe(1);
  } finally {
    probe.stop();
    wrapper.remove();
    Reflect.deleteProperty(document, "getAnimations");
  }
});
