import { getCardDefinition, type Seat, type ServerEvent } from "@aegis/shared";
import type { TranslationKey, TranslationParams } from "../i18n";

export type OpponentActionKind =
  | "played"
  | "hatched"
  | "movedFromBreeding"
  | "digivolved"
  | "attack"
  | "combatResult"
  | "revealed"
  | "effect";

export interface OpponentActionItem {
  id: string;
  kind: OpponentActionKind;
  cardId?: string;
  titleKey: TranslationKey;
  titleParams?: TranslationParams;
  detailKey?: TranslationKey;
  detailParams?: TranslationParams;
  detailText?: string;
  durationMs: number;
  correlationKey?: string;
}

export interface OpponentFeedState {
  current?: OpponentActionItem;
  pending: OpponentActionItem[];
  trail: OpponentActionItem[];
}

const SHORT_DURATION_MS = 2800;
const EFFECT_DURATION_MS = 4500;

function cardName(cardId: string): string {
  return getCardDefinition(cardId)?.nameEn ?? cardId;
}

function belongsToOpponent(eventSeat: Seat, viewerSeat: Seat): boolean {
  return eventSeat !== viewerSeat;
}

export function opponentActionFromEvent(event: ServerEvent, viewerSeat: Seat, id: string): OpponentActionItem | null {
  switch (event.kind) {
    case "cardPlayed":
      if (!belongsToOpponent(event.seat, viewerSeat)) return null;
      return {
        id,
        kind: "played",
        cardId: event.cardId,
        titleKey: "feed.opponentPlayed",
        titleParams: { card: cardName(event.cardId) },
        durationMs: SHORT_DURATION_MS,
      };
    case "hatched":
      if (!belongsToOpponent(event.seat, viewerSeat)) return null;
      return {
        id,
        kind: "hatched",
        cardId: event.cardId,
        titleKey: "feed.opponentHatched",
        titleParams: { card: cardName(event.cardId) },
        durationMs: SHORT_DURATION_MS,
      };
    case "movedFromBreeding":
      if (!belongsToOpponent(event.seat, viewerSeat)) return null;
      return {
        id,
        kind: "movedFromBreeding",
        cardId: event.cardId,
        titleKey: "feed.movedFromBreeding",
        titleParams: { card: cardName(event.cardId) },
        durationMs: SHORT_DURATION_MS,
      };
    case "digivolved":
      if (!belongsToOpponent(event.seat, viewerSeat)) return null;
      return {
        id,
        kind: "digivolved",
        cardId: event.cardId,
        titleKey: "feed.digivolved",
        titleParams: { card: cardName(event.cardId) },
        durationMs: SHORT_DURATION_MS,
      };
    case "attackDeclared":
      if (!belongsToOpponent(event.seat, viewerSeat)) return null;
      return {
        id,
        kind: "attack",
        cardId: event.attackerCardId,
        titleKey:
          event.target.kind === "player"
            ? "feed.attackedYourSecurity"
            : event.targetCardId === undefined
              ? "feed.attackedDigimonGeneric"
              : "feed.attackedDigimon",
        titleParams: {
          card: cardName(event.attackerCardId),
          ...(event.targetCardId === undefined ? {} : { target: cardName(event.targetCardId) }),
        },
        durationMs: SHORT_DURATION_MS,
        correlationKey: `attack:${event.attackerPermanentId}`,
      };
    case "combatResolved":
      if (!belongsToOpponent(event.seat, viewerSeat)) return null;
      return {
        id,
        kind: "combatResult",
        titleKey: "log.combatResolved",
        detailKey: event.deletedPermanentIds.length > 0 ? "feed.combatDeleted" : undefined,
        detailParams: { count: event.deletedPermanentIds.length },
        durationMs: SHORT_DURATION_MS,
        correlationKey: `attack:${event.attackerPermanentId}`,
      };
    case "cardRevealed":
      if (!belongsToOpponent(event.seat, viewerSeat)) return null;
      return {
        id,
        kind: "revealed",
        cardId: event.cardId,
        titleKey: event.sourceCardId === undefined ? "feed.cardRevealed" : "feed.cardRevealedBy",
        titleParams:
          event.sourceCardId === undefined
            ? { card: cardName(event.cardId) }
            : { card: cardName(event.cardId), source: cardName(event.sourceCardId) },
        durationMs: SHORT_DURATION_MS,
        correlationKey: event.sourceCardId === undefined ? undefined : `effect:${event.seat}:${event.sourceCardId}`,
      };
    case "effectActivated":
      if (!belongsToOpponent(event.seat, viewerSeat)) return null;
      return {
        id,
        kind: "effect",
        cardId: event.sourceCardId,
        titleKey: "feed.effectActivated",
        titleParams: { card: cardName(event.sourceCardId) },
        detailText: event.description,
        durationMs: EFFECT_DURATION_MS,
        correlationKey: `effect:${event.seat}:${event.sourceCardId}:${event.effectKey}`,
      };
    case "effectResolved":
      if (!belongsToOpponent(event.seat, viewerSeat)) return null;
      return {
        id,
        kind: "effect",
        cardId: event.sourceCardId,
        titleKey: "feed.effectResolved",
        titleParams: { card: cardName(event.sourceCardId) },
        detailText: event.description,
        durationMs: EFFECT_DURATION_MS,
        correlationKey: `effect:${event.seat}:${event.sourceCardId}:${event.effectKey}`,
      };
    default:
      return null;
  }
}

/** Keep feed time frozen from the first combat prompt until that combat closes. */
export function hasOpenCombatPrompt(events: readonly ServerEvent[]): boolean {
  let open = false;
  for (const event of events) {
    if (
      (event.kind === "blockWindowOpened" && event.eligibleBlockerIds.length > 0) ||
      (event.kind === "counterWindowOpened" && event.eligibleCounters.length > 0) ||
      event.kind === "alliancePrompt" ||
      event.kind === "evadePrompt" ||
      event.kind === "barrierPrompt"
    ) {
      open = true;
    }
    if (
      event.kind === "combatResolved" ||
      event.kind === "blockDeclined" ||
      event.kind === "counterResolved" ||
      event.kind === "evadeResolved" ||
      event.kind === "barrierResolved" ||
      event.kind === "securityChecked" ||
      event.kind === "gameOver" ||
      event.kind === "phaseChanged"
    ) {
      open = false;
    }
  }
  return open;
}

export function emptyOpponentFeedState(): OpponentFeedState {
  return { pending: [], trail: [] };
}

function mergeMatching(
  state: OpponentFeedState,
  incoming: OpponentActionItem,
): { state: OpponentFeedState; matched: boolean } {
  if (!incoming.correlationKey) return { state, matched: false };
  const merge = (existing: OpponentActionItem): OpponentActionItem => {
    if (existing.correlationKey !== incoming.correlationKey) return existing;
    if (incoming.kind === "combatResult") {
      return { ...existing, detailKey: incoming.detailKey, detailParams: incoming.detailParams };
    }
    return { ...incoming, id: existing.id };
  };
  if (state.current?.correlationKey === incoming.correlationKey) {
    return { state: { ...state, current: merge(state.current) }, matched: true };
  }
  const pendingIndex = state.pending.findIndex(({ correlationKey }) => correlationKey === incoming.correlationKey);
  if (pendingIndex >= 0) {
    const pending = [...state.pending];
    pending[pendingIndex] = merge(pending[pendingIndex]!);
    return { state: { ...state, pending }, matched: true };
  }
  const trailIndex = state.trail.findIndex(({ correlationKey }) => correlationKey === incoming.correlationKey);
  if (trailIndex >= 0) {
    const trail = [...state.trail];
    trail[trailIndex] = merge(trail[trailIndex]!);
    return { state: { ...state, trail }, matched: true };
  }
  return { state, matched: false };
}

export function enqueueOpponentActions(
  initial: OpponentFeedState,
  items: readonly OpponentActionItem[],
  trailCapacity = Number.POSITIVE_INFINITY,
): OpponentFeedState {
  return items.reduce((state, incoming) => {
    const merged = mergeMatching(state, incoming);
    if (merged.matched) return merged.state;
    if (incoming.kind === "combatResult") return state;
    if (!state.current) return { ...state, current: incoming };
    // Narrate the action that just happened, not an older item whose display
    // timer is still running. Anything displaced becomes immediate history.
    const displaced = [...state.pending].reverse();
    return {
      current: incoming,
      pending: [],
      trail: [...displaced, state.current, ...state.trail].slice(0, Math.max(0, trailCapacity)),
    };
  }, initial);
}

export function advanceOpponentFeed(state: OpponentFeedState, trailCapacity: number): OpponentFeedState {
  const next = state.pending[0];
  const trail = state.current
    ? [state.current, ...state.trail].slice(0, Math.max(0, trailCapacity))
    : state.trail.slice(0, Math.max(0, trailCapacity));
  return { current: next, pending: state.pending.slice(1), trail };
}
