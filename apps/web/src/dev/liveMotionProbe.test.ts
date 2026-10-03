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
