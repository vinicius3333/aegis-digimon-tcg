// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { captureReplayVideo, type VideoFailure } from "./video";

class Recorder {
  static isTypeSupported = () => true;
  static current: Recorder;
  state = "inactive";
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  onerror?: () => void;
  constructor() {
    Recorder.current = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}
let track: {
  stop: ReturnType<typeof vi.fn>;
  getSettings: () => object;
  readyState: string;
  addEventListener: ReturnType<typeof vi.fn>;
};
beforeEach(() => {
  vi.useFakeTimers();
  track = {
    stop: vi.fn<() => void>(),
    getSettings: () => ({ displaySurface: "browser" }),
    readyState: "live",
    addEventListener: vi.fn<(type: string, listener: () => void) => void>(),
  };
  vi.stubGlobal("MediaRecorder", Recorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getDisplayMedia: vi.fn<() => Promise<unknown>>(async () => ({
        getTracks: () => [track],
        getVideoTracks: () => [track],
      })),
    },
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("rejects screen/window capture and releases the selected track", async () => {
  track.getSettings = () => ({ displaySurface: "monitor" });
  await expect(
    captureReplayVideo({ complete: vi.fn<(blob: Blob) => void>(), fail: vi.fn<(reason: VideoFailure) => void>() }),
  ).rejects.toThrow("browser tab");
  expect(track.stop).toHaveBeenCalled();
});
it("cancels and frees tracks without returning a partial file", async () => {
  const complete = vi.fn<(blob: Blob) => void>();
  const fail = vi.fn<(reason: VideoFailure) => void>();
  const capture = await captureReplayVideo({ complete, fail });
  capture.start();
  Recorder.current.ondataavailable?.({ data: new Blob(["chunk"]) });
  capture.cancel();
  capture.finish();
  expect(track.stop).toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
  expect(fail).not.toHaveBeenCalled();
});
it("bounds recording duration and reports failure instead of a complete download", async () => {
  const complete = vi.fn<(blob: Blob) => void>();
  const fail = vi.fn<(reason: VideoFailure) => void>();
  const capture = await captureReplayVideo({ complete, fail });
  capture.start();
  await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
  expect(fail).toHaveBeenCalledWith("limit");
  expect(complete).not.toHaveBeenCalled();
  expect(track.stop).toHaveBeenCalled();
});
it("bounds buffered bytes and releases a recording with a single error", async () => {
  const complete = vi.fn<(blob: Blob) => void>();
  const fail = vi.fn<(reason: VideoFailure) => void>();
  const capture = await captureReplayVideo({ complete, fail });
  capture.start();
  Recorder.current.ondataavailable?.({ data: { size: 501 * 1024 * 1024 } as Blob });
  expect(fail).toHaveBeenCalledExactlyOnceWith("limit");
  expect(complete).not.toHaveBeenCalled();
  expect(track.stop).toHaveBeenCalled();
});
it("rejects an interrupted capture and never returns an incomplete video", async () => {
  const complete = vi.fn<(blob: Blob) => void>();
  const fail = vi.fn<(reason: VideoFailure) => void>();
  const capture = await captureReplayVideo({ complete, fail });
  capture.start();
  (track.addEventListener.mock.calls[0]![1] as () => void)();
  expect(fail).toHaveBeenCalledExactlyOnceWith("failed");
  expect(complete).not.toHaveBeenCalled();
  expect(track.stop).toHaveBeenCalled();
});
