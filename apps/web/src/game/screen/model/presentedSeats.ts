/* Each seat as the board shows it, which is not always the seat the server has.

   Three holds stack, in this order. The presented snapshot is the board at the revision
   the queue is narrating. A phase hold keeps the rotation the phase ribbon has not
   announced yet. A turn-start draw hold keeps the hand, hand count and deck count of the
   seat whose Draw ribbon is still queued — only that seat, because the other's cards
   belong to a turn the ribbons have already announced. A breeding hold keeps the raising
   area on its own clock. A security-effect hold keeps the battle area and trash as they were
   at the reveal until the card's [Security] clause has been read. A deletion hold keeps a deleted permanent in its slot until the
   shatter that takes it has begun. A trash-arrival hold keeps a card out of the trash until
   the batch that moved it there is narrated.

   The viewer's hand count also drops the card an optimistic play has already taken out
   of the hand, so the readout matches the cards on screen. */

import type { GameState, PlayerState, Seat } from "@aegis/shared";
import type { PresentationPacing } from "../../presentationProbe";
import { otherSeat } from "../../boardModel";
import {
  blowField,
  deletionField,
  liveProjectionFields,
  phaseField,
  securityEffectField,
  trashArrivalField,
} from "./presentedBoard";
import type { PresentedPlayer } from "../types";
import type { HeldDeletion, HeldTrashArrival } from "../../match/types";

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
  heldTrashArrivals,
  optimisticPlayedInstanceId,
  presentationPacing = "current",
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
  heldTrashArrivals: ReadonlyMap<number, HeldTrashArrival>;
  /** A card a play has already taken out of the hand, pending the server's word. */
  optimisticPlayedInstanceId: string | undefined;
  /** Paced effect results follow the narrated revision; live legality remains separate. */
  presentationPacing?: PresentationPacing;
}) {
  const paced = presentationPacing === "sequential";
  function fullStateHold(state: GameState | undefined) {
    // Coalesced server patches can enqueue a later scene while an earlier effect is
    // still being narrated. Its hold may delay that scene, but must not import its
    // future field, rotation or draw into the earlier presented revision.
    return paced && state !== undefined && state.stateVersion > shownState.stateVersion ? undefined : state;
  }
  const phaseHold = fullStateHold(heldPhaseState);
  const blowHold = fullStateHold(heldBlowState);
  const securityEffectHold = fullStateHold(heldSecurityEffectState);
  const drawHold = fullStateHold(heldDrawState?.state);
  function projectionFields(input: { player: PlayerState; live: PlayerState }) {
    // Future DP and abilities are effect results too. Live legality is read separately;
    // a paced decision opens only after its own public board revision has been reached.
    return paced ? input.player : liveProjectionFields(input);
  }
  const heldDeletionsOf = (seat: Seat) => [...heldDeletions.values()].filter((deletion) => deletion.seat === seat);
  const heldTrashArrivalsOf = (seat: Seat) =>
    [...heldTrashArrivals.values()].filter((arrival) => arrival.seat === seat);
  const presentedViewer = projectionFields({
    player: trashArrivalField({
      player: deletionField({
        player: blowField({
          player: securityEffectField({
            player: phaseField({
              player: shownState.players[viewerSeat] ?? viewer,
              held: phaseHold?.players[viewerSeat],
            }),
            held: securityEffectHold?.players[viewerSeat],
          }),
          held: blowHold?.players[viewerSeat],
        }),
        held: heldDeletionsOf(viewerSeat),
      }),
      held: heldTrashArrivalsOf(viewerSeat),
    }),
    live: viewer,
  });
  const presentedOpponent = projectionFields({
    player: trashArrivalField({
      player: deletionField({
        player: blowField({
          player: securityEffectField({
            player: phaseField({
              player: shownState.players[otherSeat(viewerSeat)] ?? opponent,
              held: phaseHold?.players[otherSeat(viewerSeat)],
            }),
            held: securityEffectHold?.players[otherSeat(viewerSeat)],
          }),
          held: blowHold?.players[otherSeat(viewerSeat)],
        }),
        held: heldDeletionsOf(otherSeat(viewerSeat)),
      }),
      held: heldTrashArrivalsOf(otherSeat(viewerSeat)),
    }),
    live: opponent,
  });
  const heldViewer = heldDrawState?.seat === viewerSeat ? drawHold?.players[viewerSeat] : undefined;
  const heldOpponent =
    heldDrawState?.seat === otherSeat(viewerSeat) ? drawHold?.players[otherSeat(viewerSeat)] : undefined;
  const handViewer = heldViewer ?? (paced ? (shownState.players[viewerSeat] ?? viewer) : viewer);
  const handOpponent = heldOpponent ?? (paced ? (shownState.players[otherSeat(viewerSeat)] ?? opponent) : opponent);
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
    shownHand: handViewer.hand,
    shownHandCount: Math.max(
      0,
      handViewer.handCount -
        (optimisticPlayedInstanceId && handViewer.hand?.some((card) => card.instanceId === optimisticPlayedInstanceId)
          ? 1
          : 0),
    ),
    shownOpponentHandCount: handOpponent.handCount,
    /** Draw ribbons and paced snapshot membership both render the shown hand. */
    handHeld: heldViewer !== undefined || paced,
  };
}
