// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createLiveMotionProbe } from "./liveMotionProbe";

afterEach(() => vi.restoreAllMocks());

it.each([
  {
    label: "an unknown start through completion",
    previous: null,
    current: 80,
    delay: 0,
    duration: 80,
    finished: true,
    missing: true,
  },
  { label: "a pending start", previous: 0, current: 0, delay: 0, duration: 250, finished: false, missing: false },
  { label: "a CSS lead-in", previous: 0, current: 100, delay: 150, duration: 233, finished: false, missing: false },
  {
    label: "a short active interval after a lead-in",
    previous: 100,
    current: 180,
    delay: 150,
    duration: 233,
    finished: false,
    missing: false,
  },
  {
    label: "the last eight native milliseconds",
    previous: 375,
    current: 383,
    delay: 150,
    duration: 233,
    finished: true,
    missing: false,
  },
  {
    label: "a retained final pose",
    previous: 250,
    current: 250,
    delay: 0,
    duration: 250,
    finished: true,
    missing: false,
  },
  { label: "active motion", previous: 50, current: 150, delay: 0, duration: 250, finished: false, missing: true },
  {
    label: "a gap crossing the lead-in",
    previous: 100,
    current: 250,
    delay: 150,
    duration: 233,
    finished: false,
    missing: true,
  },
])(
  "classifies a 100ms frame gap during $label using the native clock",
  ({ previous, current, delay, duration, finished, missing }) => {
    let nextFrame: FrameRequestCallback = () => {};
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      nextFrame = callback;
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const card = document.createElement("div");
    card.getBoundingClientRect = () => new DOMRect(10, 10, 100, 140);
    document.body.append(card);
    const animation = {
      currentTime: previous,
      playState: previous !== null && previous >= delay + duration ? "finished" : "running",
      playbackRate: 1,
      effect: {
        target: card,
        getComputedTiming: () => ({ delay, activeDuration: duration, iterations: 1, endTime: delay + duration }),
      },
    };
    let animations = [animation];
    Object.defineProperty(document, "getAnimations", { configurable: true, value: () => animations });
    const probe = createLiveMotionProbe();
    try {
      probe.start();
      nextFrame(0);
      animation.currentTime = current;
      animation.playState = finished ? "finished" : "running";
      nextFrame(100);
      expect(probe.read().animations[0]!.undersampled).toBe(missing);
      animations = [];
      nextFrame(200);
      expect(probe.read().animations[0]).toMatchObject({
        ended: true,
        // A missed removal remains uncertain unless native completion was observed.
        undersampled: finished ? missing : true,
        cutShort: false,
      });
    } finally {
      probe.stop();
      card.remove();
      Reflect.deleteProperty(document, "getAnimations");
    }
  },
);

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

it("reads shared animation geometry and normal styles once per frame", () => {
  const originalStyle = window.getComputedStyle.bind(window);
  const style = vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
    const computed = originalStyle(element, pseudo);
    if (computed.opacity === "") computed.opacity = "1";
    return computed;
  });
  let nextFrame: FrameRequestCallback = () => {};
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    nextFrame = callback;
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const card = document.createElement("div");
  const bounds = vi.fn<() => DOMRect>(() => new DOMRect(10, 10, 100, 140));
  card.getBoundingClientRect = bounds;
  document.body.append(card);
  const animations = ["reveal", "glow"].map((animationName) => ({
    animationName,
    currentTime: 16,
    playState: "running",
    effect: { target: card, getComputedTiming: () => ({ activeDuration: 200, iterations: 1, endTime: 200 }) },
  }));
  Object.defineProperty(document, "getAnimations", { configurable: true, value: () => animations });
  const probe = createLiveMotionProbe();
  try {
    probe.start();
    nextFrame(16);
    expect(bounds).toHaveBeenCalledOnce();
    expect(style.mock.calls.filter(([element, pseudo]) => element === card && !pseudo)).toHaveLength(1);
    expect(probe.read().animations.map((entry) => entry.visibleFrames)).toEqual([1, 1]);
    nextFrame(32);
    expect(bounds).toHaveBeenCalledTimes(2);
    expect(probe.read().animations.map((entry) => entry.visibleFrames)).toEqual([2, 2]);
  } finally {
    probe.stop();
    card.remove();
    Reflect.deleteProperty(document, "getAnimations");
  }
});
