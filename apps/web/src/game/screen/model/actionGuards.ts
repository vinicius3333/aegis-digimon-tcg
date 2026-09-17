/* What the board will let the viewer do right now.

   Ordinary actions wait for the presented board to catch up, then follow the live match,
   decision, turn and phase guards; effect responses use their own controls and are not
   gated here. The server can reach Breeding or Main while the turn, unsuspend and draw
   ribbons are still queued, so the phase clock has to release those actions explicitly
   rather than the phase alone. */

import { Phase, type GameState, type PlayerState, type Seat } from "@aegis/shared";
import { canMoveFromBreeding } from "../../boardModel";
import { isBreedingWindow } from "../../turnControl";

export function actionGuards({
  state,
  viewer,
  viewerSeat,
  decisionOpen,
  presenting,
  phasePresentationPending,
}: {
  state: GameState;
  viewer: PlayerState;
  viewerSeat: Seat;
  /** A decision is open, whether the server's record of it or the viewer's own prompt. */
  decisionOpen: boolean;
  /** The cue queue is still presenting a batch. */
  presenting: boolean;
  /** A turn, phase or unsuspend ribbon is still queued or on screen. */
  phasePresentationPending: boolean;
}) {
  const isMyTurn = state.turnSeat === viewerSeat;
  const turnActionBlocked =
    state.gameOver ||
    decisionOpen ||
    Boolean(state.combatWindow) ||
    presenting ||
    phasePresentationPending ||
    !isMyTurn;
  const breedingWindow = isBreedingWindow({ phase: state.phase, turnSeat: state.turnSeat, viewerSeat });
  return {
    isMyTurn,
    turnActionBlocked,
    mainActionBlocked: turnActionBlocked || state.phase !== Phase.Main,
    endPhaseBlocked: turnActionBlocked || (state.phase !== Phase.Main && state.phase !== Phase.Breeding),
    breedingWindow,
    // The breeding step is answered on the board rather than in a dialog: the egg
    // deck hatches, the raising slot moves out and the turn control ends the step.
    // These drive the highlights and the hint that stand in for the old modal.
    canHatchEgg: viewer.eggDeckCount > 0 && !viewer.breeding,
    canMoveOutOfBreeding: canMoveFromBreeding(viewer.breeding),
    /** Breeding actions open only after the phase presentation has finished. */
    breedingActionsOpen: breedingWindow && !turnActionBlocked,
  };
}
