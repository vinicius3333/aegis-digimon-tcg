import type { GameState } from "./schema/GameState.js";
import type { Seat } from "./schema/enums.js";
import type { SequencedServerEvent } from "./protocol/events.js";

export const REPLAY_CHANNEL = "replay";
export const REPLAY_FORMAT_VERSION = 1;
export const MAX_REPLAY_BYTES = 32 * 1024 * 1024;
export const MAX_SAVED_REPLAYS = 10;
export const REPLAY_SAVE_CHANNEL = "replaySave";
/** Compressed file bound for account storage; larger files can still be downloaded. */
export const MAX_SAVED_REPLAY_BYTES = 2 * 1024 * 1024;
export const MAX_REPLAY_STORAGE_BYTES = 20 * 1000 * 1000 * 1000;

export interface SavedReplay {
  id: string;
  summary: ReplaySummary;
  viewerSeat: Seat;
  bytes: number;
  savedAt: number;
  status: "pending" | "ready" | "deleting";
  visibility: "private" | "public";
}

export type ReplaySaveError = "sign_in" | "limit" | "size" | "unavailable" | "storage_full";
export type ReplaySaveMessage = { kind: "saved"; replay: SavedReplay } | { kind: "failed"; reason: ReplaySaveError };

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

/** Completed participant recording; visibleHandSeats declares the hands included in the file. */
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
      canSave?: boolean;
      /** gzip-compressed UTF-8 JSON, base64 encoded for the Colyseus channel. */
      data: string;
    }
  | { kind: "unavailable"; reason: "recording_limit" };
