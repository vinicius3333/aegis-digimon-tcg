import type { ReplayFrame } from "#shared/replays";
import { createReplayPatch } from "#shared/replays/createReplayPatch";
import type { EncodedReplayFrame } from "#shared/replays/EncodedReplayFrame";

export function encodeReplayFrames(frames: readonly ReplayFrame[]): EncodedReplayFrame[] {
  return frames.map((frame, index) => {
    if (index === 0) return { atMs: frame.atMs, events: frame.events, state: frame.state };
    const patch = createReplayPatch(frames[index - 1]!.state, frame.state);
    return patch === undefined
      ? { atMs: frame.atMs, events: frame.events }
      : { atMs: frame.atMs, events: frame.events, patch };
  });
}
