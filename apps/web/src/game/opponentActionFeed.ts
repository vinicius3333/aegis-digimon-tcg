/* The opponent's transient narration: the corner feed that says what the other
   seat just did while it is still worth reading.

   It deliberately stays silent about a play, a hatch and a digivolution. Those
   three already get the centre-screen showcase and the colour-keyed burst where
   the card lands, so narrating them here only doubled the same moment in a
   corner the player then had to look away to read. Everything the board cannot
   show on its own — an attack, an effect, a reveal, a Digimon leaving breeding —
   is still announced. */

import { getCardDefinition, type Seat, type ServerEvent } from "@aegis/shared";
import type { TranslationKey, TranslationParams } from "../i18n";
import { playerFacingEffectClause } from "./overlays";
import { TIMINGS } from "./timings";

export type OpponentActionKind = "movedFromBreeding" | "attack" | "combatResult" | "revealed" | "effect";

export interface OpponentActionItem {
  id: string;
  kind: OpponentActionKind;
  cardId?: string;
  titleKey: TranslationKey;
  titleParams?: TranslationParams;
  detailKey?: TranslationKey;
  detailParams?: TranslationParams;
  detailText?: string;
  /**
   * The cards the title names, in the order it names them, so the feed can link them the
   * way the play log does. Order carries the meaning when two cards share a printed name
   * ("Agumon revealed Agumon"), which is why this is a list and not a name lookup.
   */
  titleCardIds?: readonly string[];
  /** The cards the detail line names, same contract as {@link titleCardIds}. */
  detailCardIds?: readonly string[];
  durationMs: number;
  correlationKey?: string;
}

export interface OpponentFeedState {
  current?: OpponentActionItem;
  pending: OpponentActionItem[];
  trail: OpponentActionItem[];
}

const SHORT_DURATION_MS = TIMINGS.feedAction;
const EFFECT_DURATION_MS = TIMINGS.feedEffect;

function cardName(cardId: string): string {
  return getCardDefinition(cardId)?.nameEn ?? cardId;
}

function belongsToOpponent(eventSeat: Seat, viewerSeat: Seat): boolean {
  return eventSeat !== viewerSeat;
}

/**
 * The feed narrates an effect with the same text the notices use, so the engine's
 * own IR summary is replaced by the printed clause — or by nothing, when the card
 * offers no clause under this timing. An internal identifier is never shown.
 */
function effectDetail(cardId: string, description: string, timing?: string): string | undefined {
  return playerFacingEffectClause({ cardId, timing, description });
}

export function opponentActionFromEvent(event: ServerEvent, viewerSeat: Seat, id: string): OpponentActionItem | null {
  switch (event.kind) {
    case "movedFromBreeding":
      if (!belongsToOpponent(event.seat, viewerSeat)) return null;
      return {
        id,
        kind: "movedFromBreeding",
        cardId: event.cardId,
        titleKey: "feed.movedFromBreeding",
        titleParams: { card: cardName(event.cardId) },
        titleCardIds: [event.cardId],
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
        // The title names the attacker first, then the target it hit.
        titleCardIds:
          event.target.kind === "player" || event.targetCardId === undefined
            ? [event.attackerCardId]
            : [event.attackerCardId, event.targetCardId],
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
        // "{source} revealed {card}" names the source first, so the ids follow that order.
        titleCardIds: event.sourceCardId === undefined ? [event.cardId] : [event.sourceCardId, event.cardId],
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
        titleCardIds: [event.sourceCardId],
        detailText: effectDetail(event.sourceCardId, event.description),
        // Only the card whose clause this is can be linked: every other name in a printed
        // clause is text, with no card id behind it to open.
        detailCardIds: [event.sourceCardId],
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
        titleCardIds: [event.sourceCardId],
        detailText: effectDetail(event.sourceCardId, event.description, event.timing),
        detailCardIds: [event.sourceCardId],
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
