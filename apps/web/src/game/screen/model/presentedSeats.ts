/* Each seat as the board shows it, which is not always the seat the server has.

   Three holds stack, in this order. The presented snapshot is the board at the revision
   the queue is narrating. A phase hold keeps the rotation the phase ribbon has not
   announced yet. A turn-start draw hold keeps the hand, hand count and deck count of the
   seat whose Draw ribbon is still queued — only that seat, because the other's cards
   belong to a turn the ribbons have already announced. A breeding hold keeps the raising
   area on its own clock. A security-effect hold keeps the battle area and trash as they were
   at the reveal until the card's [Security] clause has been read. A deletion hold keeps a deleted permanent in its slot until the
   shatter that takes it has begun.

   The viewer's hand count also drops the card an optimistic play has already taken out
   of the hand, so the readout matches the cards on screen. */

import type { GameState, PlayerState, Seat } from "@aegis/shared";
import { otherSeat } from "../../boardModel";
import { blowField, deletionField, liveProjectionFields, phaseField, securityEffectField } from "./presentedBoard";
import type { PresentedPlayer } from "../types";
import type { HeldDeletion } from "../../match/types";

export function presentedSeats({
  shownState,
  viewer,
  opponent,
  viewerSeat,
  heldPhaseState,
  heldBlowState,
  heldSecurityEffectState,
  heldDrawState,
  heldBreedingState,
  heldDeletions,
  optimisticPlayedInstanceId,
}: {
  shownState: GameState;
  viewer: PlayerState;
  opponent: PlayerState;
  viewerSeat: Seat;
  heldPhaseState: GameState | undefined;
  heldBlowState: GameState | undefined;
  heldSecurityEffectState: GameState | undefined;
  heldDrawState: { seat: Seat; state: GameState } | undefined;
  heldBreedingState: { seat: Seat; player: PlayerState } | undefined;
  heldDeletions: ReadonlyMap<number, HeldDeletion>;
  /** A card a play has already taken out of the hand, pending the server's word. */
  optimisticPlayedInstanceId: string | undefined;
}) {
  const heldDeletionsOf = (seat: Seat) => [...heldDeletions.values()].filter((deletion) => deletion.seat === seat);
  const presentedViewer = liveProjectionFields({
    player: deletionField({
      player: blowField({
        player: securityEffectField({
          player: phaseField({
            player: shownState.players[viewerSeat] ?? viewer,
            held: heldPhaseState?.players[viewerSeat],
          }),
          held: heldSecurityEffectState?.players[viewerSeat],
        }),
        held: heldBlowState?.players[viewerSeat],
      }),
      held: heldDeletionsOf(viewerSeat),
    }),
    live: viewer,
  });
  const presentedOpponent = liveProjectionFields({
    player: deletionField({
      player: blowField({
        player: securityEffectField({
          player: phaseField({
            player: shownState.players[otherSeat(viewerSeat)] ?? opponent,
            held: heldPhaseState?.players[otherSeat(viewerSeat)],
          }),
          held: heldSecurityEffectState?.players[otherSeat(viewerSeat)],
        }),
        held: heldBlowState?.players[otherSeat(viewerSeat)],
      }),
      held: heldDeletionsOf(otherSeat(viewerSeat)),
    }),
    live: opponent,
  });
  const heldViewer = heldDrawState?.seat === viewerSeat ? heldDrawState.state.players[viewerSeat] : undefined;
  const heldOpponent =
    heldDrawState?.seat === otherSeat(viewerSeat) ? heldDrawState.state.players[otherSeat(viewerSeat)] : undefined;
  const shownViewer: PresentedPlayer = heldViewer
    ? { ...presentedViewer, hand: heldViewer.hand, handCount: heldViewer.handCount, deckCount: heldViewer.deckCount }
    : presentedViewer;
  const shownOpponent: PresentedPlayer = heldOpponent
    ? { ...presentedOpponent, handCount: heldOpponent.handCount, deckCount: heldOpponent.deckCount }
    : presentedOpponent;
  return {
    shownViewer,
    shownOpponent,
    breedingViewer: heldBreedingState?.seat === viewerSeat ? heldBreedingState.player : shownViewer,
    breedingOpponent: heldBreedingState?.seat === otherSeat(viewerSeat) ? heldBreedingState.player : shownOpponent,
    /** The hand the viewer can see, which a draw hold may keep behind the server's. */
    shownHand: heldViewer?.hand ?? viewer.hand,
    shownHandCount: Math.max(
      0,
      (heldViewer?.handCount ?? viewer.handCount) -
        (optimisticPlayedInstanceId && viewer.hand.some((card) => card.instanceId === optimisticPlayedInstanceId)
          ? 1
          : 0),
    ),
    shownOpponentHandCount: heldOpponent?.handCount ?? opponent.handCount,
    /** True while a draw hold is keeping the viewer's hand behind the server's. */
    handHeld: heldViewer !== undefined,
  };
}
