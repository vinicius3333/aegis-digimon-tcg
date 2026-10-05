/* Each seat as the board shows it, which is not always the seat the server has.

   Three holds stack, in this order. The presented snapshot is the board at the revision
   the queue is narrating. A phase hold keeps the rotation the phase ribbon has not
   announced yet. A turn-start draw hold keeps the hand, hand count and deck count of the
   seat whose Draw ribbon is still queued — only that seat, because the other's cards
   belong to a turn the ribbons have already announced. A breeding hold keeps the raising
   area on its own clock. A security-effect hold keeps the battle area and trash as they were
   at the reveal until the card's [Security] clause has been read. A deletion hold keeps a deleted permanent in its slot until the
   shatter that takes it has begun. A trash-arrival hold keeps a card out of the trash until
   the batch that moved it there is narrated. A source-strip hold keeps its host in place
   and its return out of the hand until the last source has peeled away.

   The viewer's hand count also drops the card an optimistic play has already taken out
   of the hand, so the readout matches the cards on screen. */

import type { GameState, PlayerState, Seat } from "@aegis/shared";
import { otherSeat } from "../../boardModel";
import {
  blowField,
  deletionField,
  liveProjectionFields,
  phaseField,
  securityEffectField,
  trashArrivalField,
  stackStripField,
} from "./presentedBoard";
import type { PresentedPlayer } from "../types";
import { stackStripHand } from "../../match/heldStackStrip";
import type { HeldDeletion, HeldStackStrip, HeldTrashArrival } from "../../match/types";

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
  heldStackStrips = new Map(),
  heldTrashArrivals,
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
  heldStackStrips?: ReadonlyMap<number, HeldStackStrip>;
  heldTrashArrivals: ReadonlyMap<number, HeldTrashArrival>;
  /** A card a play has already taken out of the hand, pending the server's word. */
  optimisticPlayedInstanceId: string | undefined;
}) {
  const heldStripsOf = (seat: Seat) => [...heldStackStrips.values()].filter((strip) => strip.seat === seat);
  viewer = stackStripHand(viewer, heldStripsOf(viewerSeat));
  opponent = stackStripHand(opponent, heldStripsOf(otherSeat(viewerSeat)));
  const heldDeletionsOf = (seat: Seat) => [...heldDeletions.values()].filter((deletion) => deletion.seat === seat);
  const heldTrashArrivalsOf = (seat: Seat) =>
    [...heldTrashArrivals.values()].filter((arrival) => arrival.seat === seat);
  const presentedViewer = liveProjectionFields({
    player: stackStripField({
      player: trashArrivalField({
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
        held: heldTrashArrivalsOf(viewerSeat),
      }),
      held: heldStripsOf(viewerSeat),
    }),
    live: viewer,
  });
  const presentedOpponent = liveProjectionFields({
    player: stackStripField({
      player: trashArrivalField({
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
        held: heldTrashArrivalsOf(otherSeat(viewerSeat)),
      }),
      held: heldStripsOf(otherSeat(viewerSeat)),
    }),
    live: opponent,
  });
  const heldViewer = heldDrawState?.seat === viewerSeat ? heldDrawState.state.players[viewerSeat] : undefined;
  const heldOpponent =
    heldDrawState?.seat === otherSeat(viewerSeat) ? heldDrawState.state.players[otherSeat(viewerSeat)] : undefined;
  const shownViewer: PresentedPlayer = heldViewer
    ? { ...presentedViewer, hand: heldViewer.hand, handCount: heldViewer.handCount, deckCount: heldViewer.deckCount }
    : { ...presentedViewer, hand: viewer.hand, handCount: viewer.handCount };
  const shownOpponent: PresentedPlayer = heldOpponent
    ? { ...presentedOpponent, handCount: heldOpponent.handCount, deckCount: heldOpponent.deckCount }
    : { ...presentedOpponent, handCount: opponent.handCount };
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
    /** True while a draw or source-strip hold keeps the viewer's hand behind the server's. */
    handHeld:
      heldViewer !== undefined || heldStripsOf(viewerSeat).some((strip) => strip.returnedInstanceId !== undefined),
  };
}
