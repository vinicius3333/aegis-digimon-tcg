import type { CardInstance, GameState, Permanent, Seat } from "@aegis/shared";
import { otherSeat } from "../../boardModel";
import type { MatchCues } from "../../match/types";
import type { PresentationPacing } from "../../presentationProbe";
import { shieldSecurityCount } from "../../securityClash";
import type { PresentedPlayer } from "../types";
import { presentedSeats } from "./presentedSeats";

type VisibleCard = Pick<CardInstance, "instanceId" | "cardId" | "artId">;

export interface VisiblePermanent {
  permanentId: string;
  topCard: VisibleCard;
  stack: readonly VisibleCard[];
  linked: readonly VisibleCard[];
  isSuspended: boolean;
  currentDP: number;
  securityAttackModifier: number;
  summoningSick: boolean;
  keywords: readonly string[];
}

export interface VisiblePlayer {
  battleArea: readonly VisiblePermanent[];
  breeding: VisiblePermanent | null;
  hand: readonly VisibleCard[];
  handCount: number;
  deckCount: number;
  eggDeckCount: number;
  trash: readonly VisibleCard[];
  securityCount: number;
  securityDpDelta: number;
}

/** The field, piles and readouts actually rendered, without an invented hybrid revision. */
export interface VisibleBoard {
  players: readonly [VisiblePlayer, VisiblePlayer];
  memory: { value: number; turnSeat: Seat };
  turn: { seat: Seat; count: number };
}

type BoardCues = Pick<
  MatchCues,
  | "heldPhaseState"
  | "heldBlowState"
  | "heldSecurityEffectState"
  | "heldDrawState"
  | "heldBreedingState"
  | "heldDeletions"
  | "heldTrashArrivals"
  | "pendingPermanentIds"
  | "heldSuspendedIds"
  | "heldSecurityCounts"
  | "securityDealCounts"
  | "heldMemory"
  | "displayedTurn"
>;

/**
 * Both the screen probe and the timing harness use this projection. A selected snapshot can
 * already contain a Security play while a reveal hold and an arrival still hide the card;
 * its stateVersion alone cannot establish that the result was visible. Copy public values
 * so a later schema patch cannot rewrite a previously recorded frame.
 */
export function visibleBoard({
  live,
  displayed,
  viewerSeat,
  cues,
  optimisticPlayedInstanceId,
  presentationPacing,
}: {
  live: GameState;
  displayed: GameState;
  viewerSeat: Seat;
  cues: BoardCues;
  optimisticPlayedInstanceId?: string;
  presentationPacing?: PresentationPacing;
}): VisibleBoard | undefined {
  const viewer = live.players[viewerSeat];
  const opponent = live.players[otherSeat(viewerSeat)];
  if (!viewer || !opponent) return undefined;
  const seats = presentedSeats({
    shownState: displayed,
    viewer,
    opponent,
    viewerSeat,
    heldPhaseState: cues.heldPhaseState,
    heldBlowState: cues.heldBlowState,
    heldSecurityEffectState: cues.heldSecurityEffectState,
    heldDrawState: cues.heldDrawState,
    heldBreedingState: cues.heldBreedingState,
    heldDeletions: cues.heldDeletions,
    heldTrashArrivals: cues.heldTrashArrivals,
    optimisticPlayedInstanceId,
    presentationPacing,
  });

  function card(value: CardInstance): VisibleCard {
    return { instanceId: value.instanceId, cardId: value.cardId, artId: value.artId };
  }

  function permanent(value: Permanent): VisiblePermanent | null {
    if (!value.topCard?.cardId || cues.pendingPermanentIds.has(value.permanentId)) return null;
    return {
      permanentId: value.permanentId,
      topCard: card(value.topCard),
      stack: [...(value.stack ?? [])].map(card),
      linked: [...(value.linked ?? [])].map(card),
      isSuspended: value.isSuspended || cues.heldSuspendedIds.has(value.permanentId),
      // CardMini prints currentDP even when the separate persistent delta badge is held.
      currentDP: value.currentDP,
      securityAttackModifier: value.securityAttackModifier,
      summoningSick: value.summoningSick,
      keywords: [...(value.keywords ?? [])],
    };
  }

  function player(seat: Seat, shown: PresentedPlayer, breeding: PresentedPlayer): VisiblePlayer {
    const mine = seat === viewerSeat;
    return {
      battleArea: [...(shown.battleArea ?? [])].flatMap((value) => {
        const visible = permanent(value);
        return visible ? [visible] : [];
      }),
      breeding: breeding.breeding ? permanent(breeding.breeding) : null,
      hand: [...((mine ? seats.shownHand : shown.hand) ?? [])]
        .filter((value) => !mine || value.instanceId !== optimisticPlayedInstanceId)
        .map(card),
      handCount: mine ? seats.shownHandCount : seats.shownOpponentHandCount,
      deckCount: shown.deckCount,
      eggDeckCount: shown.eggDeckCount,
      trash: [...(shown.trash ?? [])].map(card),
      securityCount:
        cues.securityDealCounts.get(seat) ??
        shieldSecurityCount(shown.securityCount, cues.heldSecurityCounts.get(seat)),
      securityDpDelta: shown.securityDpDelta,
    };
  }

  const shownViewer = player(viewerSeat, seats.shownViewer, seats.breedingViewer);
  const shownOpponent = player(otherSeat(viewerSeat), seats.shownOpponent, seats.breedingOpponent);
  return {
    players: viewerSeat === 0 ? [shownViewer, shownOpponent] : [shownOpponent, shownViewer],
    memory: {
      value: cues.heldMemory?.memory ?? displayed.memory,
      turnSeat: cues.heldMemory?.turnSeat ?? displayed.turnSeat,
    },
    turn: {
      seat: cues.displayedTurn?.seat ?? displayed.turnSeat,
      count: cues.displayedTurn?.count ?? displayed.turnCount,
    },
  };
}
