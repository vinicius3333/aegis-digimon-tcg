/** Actual tab frames encoded by the browser; the format is checked, never renamed from WebM. */
export function mp4MimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getDisplayMedia) return undefined;
  return ["video/mp4;codecs=avc1.42001E", "video/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
}

export type VideoFailure = "failed" | "limit";
export interface ReplayVideoCapture {
  start(): void;
  finish(): void;
  cancel(): void;
}
export async function captureReplayVideo(callbacks: {
  complete: (blob: Blob) => void;
  fail: (reason: VideoFailure) => void;
}): Promise<ReplayVideoCapture> {
  const mimeType = mp4MimeType();
  if (!mimeType) throw new Error("MP4 unavailable");
  const options: DisplayMediaStreamOptions & {
    preferCurrentTab: boolean;
    selfBrowserSurface: string;
    surfaceSwitching: string;
  } = {
    video: { displaySurface: "browser", frameRate: 30 },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: "include",
    surfaceSwitching: "exclude",
  };
  const stream = await navigator.mediaDevices.getDisplayMedia(options);
  const release = () => stream.getTracks().forEach((track) => track.stop());
  let recorder: MediaRecorder;
  try {
    const track = stream.getVideoTracks()[0];
    if (!track || (track.getSettings().displaySurface && track.getSettings().displaySurface !== "browser"))
      throw new Error("Select the Aegis browser tab");
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  } catch (error) {
    release();
    throw error;
  }
  let complete = false;
  let cancelled = false;
  let stopped = false;
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let chunks: Blob[] = [];
  function cleanup() {
    clearTimeout(timer);
    release();
    document.removeEventListener("visibilitychange", hidden);
  }
  function fail(reason: VideoFailure) {
    if (stopped || cancelled) return;
    cancelled = true;
    chunks = [];
    if (recorder.state !== "inactive") recorder.stop();
    cleanup();
    callbacks.fail(reason);
  }
  function hidden() {
    if (document.hidden) fail("failed");
  }
  recorder.ondataavailable = (event) => {
    if (cancelled || !event.data.size) return;
    bytes += event.data.size;
    if (bytes > 500 * 1024 * 1024) {
      fail("limit");
      return;
    }
    chunks.push(event.data);
  };
  recorder.onerror = () => fail("failed");
  recorder.onstop = () => {
    stopped = true;
    cleanup();
    if (!cancelled && complete && chunks.length) callbacks.complete(new Blob(chunks, { type: "video/mp4" }));
    else if (!cancelled) callbacks.fail("failed");
    chunks = [];
  };
  stream.getVideoTracks()[0]!.addEventListener("ended", () => fail("failed"));
  return {
    start() {
      if (cancelled || stopped || stream.getVideoTracks()[0]?.readyState !== "live") throw new Error("Capture ended");
      recorder.start(1000);
      document.addEventListener("visibilitychange", hidden);
      timer = setTimeout(() => fail("limit"), 30 * 60 * 1000);
    },
    finish() {
      if (!cancelled && !stopped && recorder.state === "recording") {
        complete = true;
        recorder.stop();
      }
    },
    cancel() {
      cancelled = true;
      chunks = [];
      if (recorder.state !== "inactive") recorder.stop();
      cleanup();
    },
  };
}
