import type { Seat, ServerEvent } from "@aegis/shared";
import type { TrainingObservation } from "./observation.js";

export const HISTORY_LIMIT = 64;
export interface ObservedHistoryEvent {
  kind: string;
  seat?: Seat;
  cardIds: string[];
  amount?: number;
}
export interface ObservedHistory {
  /** Historical identities only: this does not locate cards in hidden zones. */
  seenCardIds: string[];
  recent: ObservedHistoryEvent[];
}

/** Consumes broadcast facts and already-filtered observations, never authoritative hidden zones. */
export function createObservationHistory() {
  const seen = new Set<string>();
  const recent: ObservedHistoryEvent[] = [];
  let turnSeat: Seat | undefined;
  function append(event: ObservedHistoryEvent): void {
    for (const id of event.cardIds) seen.add(id);
    recent.push(event);
    if (recent.length > HISTORY_LIMIT) recent.shift();
  }
  return {
    observeEvent(event: ServerEvent): void {
      switch (event.kind) {
        case "matchStarted":
          seen.clear();
          recent.length = 0;
          turnSeat = event.firstSeat;
          break;
        case "phaseChanged":
          turnSeat = event.turnSeat;
          append({ kind: `phaseChanged:${event.phase}`, seat: event.turnSeat, cardIds: [] });
          break;
        case "cardPlayed":
        case "digivolved":
        case "hatched":
        case "movedFromBreeding":
        case "cardRevealed":
          append({ kind: event.kind, seat: event.seat, cardIds: [event.cardId] });
          break;
        case "securityRevealed":
          append({ kind: event.kind, seat: event.seat, cardIds: [event.revealedCardId] });
          break;
        case "attackDeclared":
          append({
            kind: event.kind,
            seat: event.seat,
            cardIds: [event.attackerCardId, ...(event.targetCardId ? [event.targetCardId] : [])],
          });
          break;
        case "memoryChanged":
          append({
            kind: event.kind,
            cardIds: [],
            ...(turnSeat === undefined ? {} : { seat: turnSeat, amount: event.to - event.from }),
          });
          break;
        case "securityRecovered":
          append({ kind: event.kind, seat: event.seat, cardIds: [], amount: event.amount });
          break;
        case "deckShuffled":
          append({ kind: event.kind, seat: event.seat, cardIds: [] });
          break;
      }
    },
    observe(observation: TrainingObservation): void {
      turnSeat = observation.turnSeat;
      for (const player of observation.players) {
        const permanents = [...player.board, ...(player.breeding ? [player.breeding] : [])];
        const cards = [
          ...player.hand,
          ...player.trash,
          ...player.delay,
          ...player.faceUpSecurity,
          ...permanents.flatMap((unit) => [unit.top, ...unit.stack, ...unit.linked]),
        ];
        for (const card of cards) if (card.cardId) seen.add(card.cardId);
      }
      for (const card of observation.revealed) if (card.cardId) seen.add(card.cardId);
    },
    snapshot(): ObservedHistory {
      return {
        seenCardIds: [...seen].sort(),
        recent: recent.map((event) => ({ ...event, cardIds: [...event.cardIds] })),
      };
    },
  };
}
