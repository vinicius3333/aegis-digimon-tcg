import type { Seat } from "../schema/enums.js";

export const ROOM_TYPE_MANUAL = "aegis_manual";
export const ROOM_TYPE_MANUAL_PRIVATE = "aegis_manual_private";
export const MANUAL_COMMAND = "manual:command";
export const MANUAL_SNAPSHOT = "manual:snapshot";
export const MANUAL_ERROR = "manual:error";
export const MANUAL_SYNC = "manual:sync";
export const MANUAL_ZONES = ["hand", "deck", "eggDeck", "security", "trash", "reveal", "battle", "breeding"] as const;
export type ManualZone = (typeof MANUAL_ZONES)[number];
export type ManualLooseZone = Exclude<ManualZone, "battle" | "breeding">;
export type ManualFieldZone = "battle" | "breeding";
export interface ManualCard {
  id: string;
  cardId: string;
  artId: string;
  faceUp: boolean;
}
export interface ManualStack {
  id: string;
  cards: ManualCard[]; // top first
  links: ManualCard[];
  suspended: boolean;
  dp: number;
  note: string;
}
export interface ManualPlayer {
  name: string;
  connected: boolean;
  ready: boolean;
  mulligan: boolean;
  hand: ManualCard[];
  deck: ManualCard[];
  eggDeck: ManualCard[];
  security: ManualCard[];
  trash: ManualCard[];
  reveal: ManualCard[];
  battle: ManualStack[];
  breeding: ManualStack[];
}
export interface ManualHistory {
  id: number;
  seat: Seat;
  action: string;
  detail: string;
}
export interface ManualTableState {
  revision: number;
  phase: "setup" | "playing" | "over";
  turn: Seat;
  memory: number; // positive toward seat 0, independent of turn
  winner: Seat | null;
  players: ManualPlayer[];
  history: ManualHistory[];
  undo: { seat: Seat; revision: number } | null;
}
export interface ManualSnapshot extends ManualTableState {
  seat: Seat;
  roomCode: string;
  inspection: { zone: "deck" | "security" | "eggDeck"; cards: ManualCard[] } | null;
}
export type ManualAction =
  | { type: "ready" | "mulligan" | "concede" | "undoRequest" }
  | { type: "undoReply"; accept: boolean }
  | { type: "first" | "turn"; seat: Seat }
  | { type: "memory"; value: number }
  | { type: "take"; from: ManualLooseZone; to: ManualZone; count: number; bottom?: boolean }
  | { type: "move"; card: string; to: ManualZone; target?: string; placement?: "top" | "bottom" | "link" }
  | { type: "moveStack"; stack: string; to: ManualZone; target?: string; placement?: "top" | "bottom" }
  | { type: "suspend"; stack: string; value: boolean }
  | { type: "annotate"; stack: string; dp: number; note: string }
  | { type: "shuffle"; zone: "deck" | "eggDeck" | "security" }
  | { type: "inspect"; zone: "deck" | "eggDeck" | "security" | null }
  | { type: "flip"; card: string; faceUp: boolean }
  | { type: "attack"; stack: string; target?: string }
  | { type: "roll" }
  | { type: "chat"; text: string };
export interface ManualCommand {
  revision: number;
  action: ManualAction;
}
