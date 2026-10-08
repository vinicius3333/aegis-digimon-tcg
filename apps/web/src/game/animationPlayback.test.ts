import { describe, expect, it, vi } from "vitest";
import { createAnimationPlayback } from "./animationPlayback";

function animation(state = "running", rate = 1) {
  const entry = {
    playState: state,
    playbackRate: rate,
    updatePlaybackRate: vi.fn<(next: number) => void>((next: number) => {
      entry.playbackRate = next;
    }),
    pause: vi.fn<() => void>(() => {
      entry.playState = "paused";
    }),
    play: vi.fn<() => void>(() => {
      entry.playState = "running";
    }),
  };
  return entry;
}

describe("scoped painted playback", () => {
  it("scales newly mounted animations and restores only animations it paused", () => {
    const moving = animation();
    const independentlyPaused = animation("paused", 2);
    const untouched = animation();
    const entries = [moving, independentlyPaused];
    const playback = createAnimationPlayback(() => entries as unknown as Animation[]);
    playback.apply(4, true);
    expect(moving.playbackRate).toBe(4);
    expect(moving.playState).toBe("paused");
    const later = animation();
    entries.push(later);
    playback.apply(0.5, true);
    expect(later.playState).toBe("paused");
    expect(later.playbackRate).toBe(0.5);
    playback.apply(0.5, false);
    expect(moving.playState).toBe("running");
    expect(independentlyPaused.play).not.toHaveBeenCalled();
    expect(untouched.updatePlaybackRate).not.toHaveBeenCalled();
    playback.apply(0.5, true);
    playback.release();
    expect(moving.playbackRate).toBe(1);
    expect(moving.playState).toBe("running");
    expect(independentlyPaused.playbackRate).toBe(2);
    expect(independentlyPaused.playState).toBe("paused");
  });
});
