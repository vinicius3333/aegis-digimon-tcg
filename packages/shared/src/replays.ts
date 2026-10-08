import type { GameState } from "./schema/GameState.js";
import type { Seat } from "./schema/enums.js";
import type { SequencedServerEvent } from "./protocol/events.js";

export const REPLAY_CHANNEL = "replay";
export const REPLAY_FORMAT_VERSION = 1;
export const MAX_REPLAY_BYTES = 32 * 1024 * 1024;

/** Plain serialized state; consumers read fields and never call Schema methods. */
export interface ReplayFrame {
  atMs: number;
  state: GameState;
  events: SequencedServerEvent[];
}

export interface ReplaySummary {
  id: string;
  players: [string, string];
  mode: "casual" | "private" | "ranked" | "bot" | "tournament" | "unlimited" | "beta";
  startedAt: number;
  finishedAt: number;
  winnerSeat: number;
  frameCount: number;
}

/** A portable recording of what one participant was allowed to see. */
export interface MatchReplay extends ReplaySummary {
  format: "aegis-replay";
  version: typeof REPLAY_FORMAT_VERSION;
  frames: ReplayFrame[];
  viewerSeat: Seat;
  visibleHandSeats: Seat[];
}

/** Only the corresponding participant receives this message; observers receive no file. */
export type ReplayDownloadMessage =
  | {
      kind: "ready";
      summary: ReplaySummary;
      viewerSeat: Seat;
      /** gzip-compressed UTF-8 JSON, base64 encoded for the Colyseus channel. */
      data: string;
    }
  | { kind: "unavailable"; reason: "recording_limit" };
