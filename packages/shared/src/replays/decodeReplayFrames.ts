import { MAX_REPLAY_FRAMES, type ReplayFrame } from "#shared/replays";
import { applyReplayPatch } from "#shared/replays/applyReplayPatch";

const MAX_COPIED_ENTRIES = 5_000_000;

export function decodeReplayFrames(frames: unknown, maxCopiedEntries = MAX_COPIED_ENTRIES): ReplayFrame[] {
  if (!Array.isArray(frames) || frames.length === 0) throw new Error("A replay needs at least one frame");
  if (frames.length > MAX_REPLAY_FRAMES) throw new Error("A replay has too many frames");
  const budget = { remaining: maxCopiedEntries };
  let state: unknown;
  return frames.map((frame: unknown, index) => {
    if (typeof frame !== "object" || frame === null || Array.isArray(frame)) throw new Error("Invalid replay frame");
    const entry = frame as Record<string, unknown>;
    if ("state" in entry) state = entry.state;
    else if (index === 0) throw new Error("The first replay frame needs a full state");
    else if (entry.patch !== undefined) state = applyReplayPatch(state, entry.patch, budget);
    return { atMs: entry.atMs, events: entry.events, state } as ReplayFrame;
  });
}
