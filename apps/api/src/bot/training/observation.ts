import {
  effectiveExactNames,
  getCardDefinition,
  type CardInstance,
  type DecisionRequest,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import type { SelectionCard } from "./decisions.js";

export interface ObservedCard extends SelectionCard {
  instanceId: string;
  faceUp: boolean;
  level?: number;
  kinds?: readonly string[];
}

export interface ObservedPermanent {
  permanentId: string;
  top: ObservedCard;
  stack: ObservedCard[];
  linked: ObservedCard[];
  dp: number;
  suspended: boolean;
  keywords: string[];
  enteredThisTurn: boolean;
  canAttackPlayer: boolean;
  attackablePermanentIds: string[];
  activatableEffectsJson: string;
}

export interface TrainingObservation {
  schemaVersion: 1;
  seat: Seat;
  turnSeat: Seat;
  turn: number;
  phase: string;
  memory: number;
  players: {
    seat: Seat;
    handCount: number;
    deckCount: number;
    eggDeckCount: number;
    securityCount: number;
    hand: ObservedCard[];
    trash: ObservedCard[];
    delay: ObservedCard[];
    faceUpSecurity: ObservedCard[];
    board: ObservedPermanent[];
    breeding?: ObservedPermanent;
  }[];
  revealed: ObservedCard[];
}

function observedCard(card: Pick<CardInstance, "instanceId" | "cardId" | "faceUp">, readable: boolean): ObservedCard {
  const definition = readable ? getCardDefinition(card.cardId) : undefined;
  return {
    instanceId: card.instanceId,
    faceUp: card.faceUp,
    ...(definition === undefined
      ? {}
      : {
          cardId: definition.cardId,
          level: definition.level,
          playCost: definition.playCost,
          dp: definition.dp,
          colors: [...definition.colors],
          names: effectiveExactNames(definition),
          kinds: [...definition.kinds],
        }),
  };
}

/** Deliberate allowlist: no schema.toJSON(), deck order, or opponent hand traversal. */
export function trainingObservation(state: GameState, seat: Seat, request?: DecisionRequest): TrainingObservation {
  if (request !== undefined && request.seat !== seat)
    throw new Error("Cannot observe another player's private decision");
  const permanent = (value: Permanent): ObservedPermanent => ({
    permanentId: value.permanentId,
    top: observedCard(value.topCard, value.topCard.faceUp || value.topCard.ownerSeat === seat),
    stack: Array.from(value.stack, (card) => observedCard(card, card.faceUp || card.ownerSeat === seat)),
    linked: Array.from(value.linked, (card) => observedCard(card, card.faceUp || card.ownerSeat === seat)),
    dp: value.currentDP,
    suspended: value.isSuspended,
    keywords: [...value.keywords],
    enteredThisTurn: value.enterFieldTurnCount === state.turnCount,
    canAttackPlayer: value.canAttackPlayer,
    attackablePermanentIds: [...value.attackablePermanentIds],
    activatableEffectsJson: value.activatableEffectsJson,
  });
  return {
    schemaVersion: 1,
    seat,
    turnSeat: state.turnSeat,
    turn: state.turnCount,
    phase: state.phase,
    memory: state.memory,
    players: Array.from(state.players, (player) => ({
      seat: player.seat,
      handCount: player.hand.length,
      deckCount: player.deck.length,
      eggDeckCount: player.eggDeck.length,
      securityCount: player.security.length,
      hand: player.seat === seat ? Array.from(player.hand, (card) => observedCard(card, true)) : [],
      trash: Array.from(player.trash, (card) => observedCard(card, true)),
      delay: Array.from(player.delayZone, (card) => observedCard(card, card.faceUp || card.ownerSeat === seat)),
      faceUpSecurity: Array.from(player.security)
        .filter((card) => card.faceUp)
        .map((card) => observedCard(card, true)),
      board: Array.from(player.battleArea, permanent),
      ...(player.breeding === undefined ? {} : { breeding: permanent(player.breeding) }),
    })),
    revealed: (request?.options?.visibleCards ?? []).map((card) => observedCard({ ...card, faceUp: true }, true)),
  };
}

/** The same visible information feeds joint-choice legality and policy features. */
export function selectionCards(observation: TrainingObservation): Map<string, SelectionCard> {
  const cards = new Map<string, SelectionCard>();
  const take = (card: ObservedCard): void => {
    cards.set(card.instanceId, card);
  };
  for (const player of observation.players) {
    for (const card of [...player.hand, ...player.trash, ...player.delay, ...player.faceUpSecurity]) take(card);
    for (const permanent of [...player.board, ...(player.breeding === undefined ? [] : [player.breeding])]) {
      take(permanent.top);
      cards.set(permanent.top.instanceId, { ...permanent.top, dp: permanent.dp });
      for (const card of [...permanent.stack, ...permanent.linked]) take(card);
      cards.set(permanent.permanentId, { ...permanent.top, dp: permanent.dp });
    }
  }
  for (const card of observation.revealed) take(card);
  return cards;
}
