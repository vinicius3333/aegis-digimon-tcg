import type { ReplayFrame } from "#shared/replays";
import { applyReplayPatch } from "#shared/replays/applyReplayPatch";

export function decodeReplayFrames(frames: unknown): ReplayFrame[] {
  if (!Array.isArray(frames) || frames.length === 0) throw new Error("A replay needs at least one frame");
  let state: unknown;
  return frames.map((frame: unknown, index) => {
    if (typeof frame !== "object" || frame === null || Array.isArray(frame)) throw new Error("Invalid replay frame");
    const entry = frame as Record<string, unknown>;
    if ("state" in entry) state = entry.state;
    else if (index === 0) throw new Error("The first replay frame needs a full state");
    else if (entry.patch !== undefined) state = applyReplayPatch(state, entry.patch);
    return { atMs: entry.atMs, events: entry.events, state } as ReplayFrame;
  });
}
