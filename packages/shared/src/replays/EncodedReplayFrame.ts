import type { SequencedServerEvent } from "#shared/protocol/events";
import type { GameState } from "#shared/schema/GameState";
import type { ReplayPatch } from "#shared/replays/ReplayPatch";

export type EncodedReplayFrame =
  | { atMs: number; events: SequencedServerEvent[]; state: GameState }
  | { atMs: number; events: SequencedServerEvent[]; patch?: ReplayPatch };
