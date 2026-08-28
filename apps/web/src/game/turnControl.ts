/* The one round button on the memory band, and the three things it can be.

   The reference client rotates a single control through the turn: it ends the
   breeding step, then the turn, and sits disabled while the opponent plays. All
   three states send the same `endPhase` intent the server already advances on —
   the breeding step has no end-intent of its own — so this module only decides
   which face the button wears, from the phase and turn the server broadcasts. */

import { Phase, type Seat } from "@aegis/shared";

export type TurnControlState = "endTurn" | "endBreeding" | "waiting";

/**
 * Whether the viewer is inside their own breeding step — the window the board
 * dims around the breeding slot for. Phase and turn are both server truth.
 */
export function isBreedingWindow({
  phase,
  turnSeat,
  viewerSeat,
}: {
  phase: string;
  turnSeat: Seat;
  viewerSeat: Seat;
}): boolean {
  return phase === Phase.Breeding && turnSeat === viewerSeat;
}

/** Which face the round control wears right now. */
export function turnControlState({
  phase,
  turnSeat,
  viewerSeat,
}: {
  phase: string;
  turnSeat: Seat;
  viewerSeat: Seat;
}): TurnControlState {
  if (turnSeat !== viewerSeat) return "waiting";
  return phase === Phase.Breeding ? "endBreeding" : "endTurn";
}

const CONTROL_LABEL_KEYS = {
  endTurn: "game.endPhase",
  endBreeding: "game.endBreeding",
  waiting: "game.opponentsTurn",
} as const;

/** The translation key the control prints in a given state. */
export function turnControlLabelKey(state: TurnControlState): (typeof CONTROL_LABEL_KEYS)[TurnControlState] {
  return CONTROL_LABEL_KEYS[state];
}
