/* The match log: turning server events into the lines the ticker prints. */

import { getCardDefinition, type DecisionRequest, type Seat, type ServerEvent } from "@aegis/shared";
import type { Translate, TranslationKey } from "../i18n";
import { otherSeat } from "./boardModel";

export type LogKind = "you" | "opp" | "sys";

export interface LogLine {
  text: string;
  kind: LogKind;
  /**
   * The cards this line names, so the play log can turn their names into links
   * (`PlayLog.cs`). The names are already inside `text`; this says which card each
   * one is, rather than making the reader guess from the printed name.
   *
   * Listed in the order the sentence names them: two cards can share a printed name,
   * and order is the only thing that then tells the reader's link apart from the other.
   */
  cardIds?: readonly string[];
}

const LOG_ZONE_KEYS: Record<string, TranslationKey> = {
  deck: "log.zone.deck",
  deckBottom: "log.zone.deckBottom",
  hand: "log.zone.hand",
  battleArea: "log.zone.battleArea",
  play: "log.zone.battleArea",
  breeding: "log.zone.breeding",
  security: "log.zone.security",
  trash: "log.zone.trash",
  eggDeck: "log.zone.eggDeck",
  delay: "log.zone.delay",
  underTamer: "log.zone.underTamer",
  various: "log.zone.various",
  suspended: "log.zone.suspended",
  unsuspended: "log.zone.unsuspended",
};

function logZoneLabel(zone: string, t: Translate): string {
  const key = LOG_ZONE_KEYS[zone];
  return key ? t(key) : zone;
}

const cardName = (cardId: string): string => getCardDefinition(cardId)?.nameEn ?? cardId;

/** Most recent effect source card id for a given seat, to label a decision overlay (best-effort). */
export function lastEffectSource(events: ServerEvent[], seat: Seat): string | undefined {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i]!;
    if ((e.kind === "effectActivated" || e.kind === "effectResolved") && e.seat === seat) return e.sourceCardId;
    if (e.kind === "cardPlayed" && e.seat === seat) return e.cardId;
  }
  return undefined;
}

/**
 * Source shown by a decision modal. Trigger ordering must never guess from the
 * event log: that log may already contain a different card's resolution, which
 * made BlackGatomon's pending effect appear as Angewomon. A lone order trigger
 * receives its authoritative source from the server; a multi-trigger choice stays
 * source-neutral and identifies each card in its rows.
 */
export function decisionEffectSource(request: DecisionRequest, events: ServerEvent[]): string | undefined {
  if (request.sourceCardId !== undefined) return request.sourceCardId;
  if (request.kind === "orderTriggers") return undefined;
  return lastEffectSource(events, request.seat);
}

/**
 * Record the card identities an event itself publishes.
 *
 * The log narrates history, so it cannot resolve a name through the CURRENT board:
 * `buildInstanceIndex` forgets a permanent the moment it is deleted or bounced, which
 * silently rewrote every past line about it. The event stream never forgets, so the
 * identities it carries are accumulated as the log walks forward through it.
 */
function rememberEventIdentities(identities: Map<string, string>, event: ServerEvent): void {
  switch (event.kind) {
    case "cardPlayed":
      if (event.permanentId !== undefined) identities.set(event.permanentId, event.cardId);
      return;
    case "digivolved":
    case "hatched":
    case "movedFromBreeding":
      identities.set(event.permanentId, event.cardId);
      return;
    case "attackDeclared":
      identities.set(event.attackerPermanentId, event.attackerCardId);
      if (event.target.kind === "permanent" && event.targetCardId !== undefined) {
        identities.set(event.target.permanentId, event.targetCardId);
      }
      return;
    default:
      return;
  }
}

/**
 * The most recent `limit` events as match-log lines, newest first.
 *
 * Walks the stream forwards, not backwards, so each line is described against the card
 * identities known AT that point in the match (see `rememberEventIdentities`) rather than
 * against a board that has moved on. `instanceIndex` seeds those identities, which is what
 * still names a permanent whose arrival predates the rolling event window.
 *
 * A paid play emits separate `playCard` and `payCost` memory events carrying the same
 * before/after values, which would render as duplicate player-facing lines; consecutive identical
 * MEMORY lines therefore collapse into one. Nothing else collapses: two identical lines of any
 * other kind are two things that really happened, and both players milling 2 cards reads the same
 * way while being two distinct moves.
 */
export function buildMatchLog(
  events: readonly ServerEvent[],
  viewerSeat: Seat,
  instanceIndex: Map<string, string>,
  t: Translate,
  limit = 30,
): LogLine[] {
  const identities = new Map(instanceIndex);
  const chronological: LogLine[] = [];
  for (const event of events) {
    rememberEventIdentities(identities, event);
    const line = describeEvent(event, viewerSeat, identities, t);
    if (!line) continue;
    const previous = chronological.at(-1);
    const duplicateMemoryLine =
      event.kind === "memoryChanged" && previous?.text === line.text && previous.kind === line.kind;
    if (!duplicateMemoryLine) chronological.push(line);
  }
  return chronological.reverse().slice(0, limit);
}

/**
 * Turn the server's event into a one-line match-log entry, or null to skip it.
 *
 * `identities` maps permanent and card-instance ids to card ids. Pass the accumulating
 * map `buildMatchLog` maintains; a live board index alone loses every card that has left
 * the field, which is exactly what a history line must keep naming.
 */
export function describeEvent(
  event: ServerEvent,
  viewerSeat: Seat,
  identities: ReadonlyMap<string, string>,
  t: Translate,
): LogLine | null {
  const mine = (seat: Seat): LogKind => (seat === viewerSeat ? "you" : "opp");
  const phaseName = (phase: string): string => t(`game.phase.${phase}` as TranslationKey);
  switch (event.kind) {
    case "matchStarted":
      return { text: t(event.firstSeat === viewerSeat ? "log.matchStartedYou" : "log.matchStartedOpp"), kind: "sys" };
    case "phaseChanged":
      return {
        text: t(event.turnSeat === viewerSeat ? "log.phaseYours" : "log.phaseOpponents", {
          phase: phaseName(event.phase),
          turn: event.turnCount,
        }),
        kind: "sys",
      };
    case "turnEnded": {
      const yours = event.endingSeat === viewerSeat;
      const nextIsYours = event.nextSeat === viewerSeat;
      const key = yours
        ? nextIsYours
          ? "log.turnEndedYoursNext"
          : "log.turnEndedYours"
        : nextIsYours
          ? "log.turnEndedOpp"
          : "log.turnEndedOppNext";
      return { text: t(key), kind: yours ? "you" : "opp" };
    }
    case "cardPlayed":
      return {
        text: t(event.seat === viewerSeat ? "log.youPlayed" : "log.oppPlayed", { card: cardName(event.cardId) }),
        kind: mine(event.seat),
        cardIds: [event.cardId],
      };
    case "hatched":
      return {
        text: t("log.hatched", { card: cardName(event.cardId) }),
        kind: mine(event.seat),
        cardIds: [event.cardId],
      };
    case "movedFromBreeding":
      return {
        text: t("log.movedFromBreeding", { card: cardName(event.cardId) }),
        kind: mine(event.seat),
        cardIds: [event.cardId],
      };
    case "digivolved":
      return { text: t("log.digivolved", { card: cardName(event.cardId) }), kind: "sys", cardIds: [event.cardId] };
    case "memoryChanged":
      // The server reason is an internal event name (for example `playCard` or
      // `payCost`). It is useful for diagnostics, but exposing it in the match
      // history makes the UI read like a debug trace. Card-play, digivolution,
      // and effect events already provide the player-facing context, so keep
      // this line focused on the observable memory change.
      return { text: t("log.memoryChanged", { from: event.from, to: event.to }), kind: "sys" };
    case "attackDeclared": {
      // The event carries the attacker's identity, so the line keeps its name (and its
      // link) after the attacker has been deleted. Naming the target too gives the
      // `targetCardId` the line already carried something to link to.
      const targetCardId = event.target.kind === "player" ? undefined : event.targetCardId;
      const target =
        event.target.kind === "player"
          ? t("log.targetSecurity")
          : targetCardId === undefined
            ? t("log.targetDigimon")
            : cardName(targetCardId);
      return {
        // A redirect re-narrates an attack the log already opened, so it reads as the
        // switch it is rather than as a second declaration by the same attacker.
        text:
          event.redirected === true
            ? t("log.attackTargetSwitched", { target })
            : t("log.attackOnBy", { target, card: cardName(event.attackerCardId) }),
        kind: "sys",
        // Ordered as the sentence names them: the target, then the attacker.
        cardIds: [targetCardId, event.attackerCardId].filter((id): id is string => id !== undefined),
      };
    }
    case "blockWindowOpened":
      return { text: t("log.blockWindow"), kind: "sys" };
    case "blocked":
      return { text: t("log.blocked"), kind: "sys" };
    case "blockDeclined":
      // The open block window is logged, so its outcome has to be too; otherwise the
      // history ends on a question the reader can't answer.
      return { text: t("log.blockDeclined"), kind: "sys" };
    case "counterResolved":
      // A passed window is a non-event: only an activated [Counter] changed anything.
      return event.activated ? { text: t("log.counterActivated"), kind: "sys" } : null;
    case "evadeResolved": {
      if (!event.accepted) return null; // declining leaves the deletion to be logged on its own
      const cardId = identities.get(event.permanentId);
      return {
        text: t("log.evadeUsed", { card: cardId === undefined ? t("log.targetDigimon") : cardName(cardId) }),
        kind: "sys",
        ...(cardId === undefined ? {} : { cardIds: [cardId] }),
      };
    }
    case "barrierResolved": {
      if (!event.accepted) return null;
      const cardId = identities.get(event.permanentId);
      return {
        text: t("log.barrierUsed", { card: cardId === undefined ? t("log.targetDigimon") : cardName(cardId) }),
        kind: "sys",
        ...(cardId === undefined ? {} : { cardIds: [cardId] }),
      };
    }
    case "combatResolved": {
      const deleted = event.deletedPermanentIds.map((id) => identities.get(id));
      const named = deleted.filter((id): id is string => id !== undefined);
      // All or nothing: a partial list would read as the complete one.
      if (named.length > 0 && named.length === deleted.length) {
        return {
          text: t("log.combatResolvedDeletedNamed", { cards: named.map(cardName).join(", ") }),
          kind: "sys",
          cardIds: named,
        };
      }
      return {
        text: deleted.length ? t("log.combatResolvedDeleted", { count: deleted.length }) : t("log.combatResolved"),
        kind: "sys",
      };
    }
    case "deletionPrevented": {
      const cardId = event.cardId ?? identities.get(event.permanentId);
      return {
        text: t("log.deletionPrevented", {
          keyword: event.keyword,
          card: cardId === undefined ? t("log.targetDigimon") : cardName(cardId),
        }),
        kind: "sys",
        ...(cardId === undefined ? {} : { cardIds: [cardId] }),
      };
    }
    case "securityChecked":
      return {
        text: t(event.seat === viewerSeat ? "log.securityCheckYou" : "log.securityCheckOpp", {
          card: cardName(event.revealedCardId),
          resolution: event.resolution,
        }),
        kind: mine(otherSeat(event.seat)),
        cardIds: [event.revealedCardId],
      };
    case "securityRecovered":
      return {
        text: t(event.seat === viewerSeat ? "log.recoveryYou" : "log.recoveryOpp", { count: event.amount }),
        kind: mine(event.seat),
      };
    case "cardRevealed": {
      const yours = event.seat === viewerSeat;
      const source = event.sourceCardId === undefined ? undefined : cardName(event.sourceCardId);
      return {
        text: t(
          source === undefined
            ? yours
              ? "log.cardRevealedYou"
              : "log.cardRevealedOpp"
            : yours
              ? "log.cardRevealedByYou"
              : "log.cardRevealedByOpp",
          source === undefined ? { card: cardName(event.cardId) } : { card: cardName(event.cardId), source },
        ),
        kind: mine(event.seat),
        cardIds: [event.cardId, event.sourceCardId].filter((id): id is string => id !== undefined),
      };
    }
    case "effectActivated":
      // Only the source card is linked. The description is generated text: the card names
      // inside it cannot be tied back to a card id without guessing which printing is meant,
      // and a wrong link is worse than none.
      return {
        text: t("log.effectActivated", { card: cardName(event.sourceCardId), description: event.description }),
        kind: "sys",
        cardIds: [event.sourceCardId],
      };
    case "effectResolved":
      // The transient clause overlay disappears, so the log is the only permanent record a
      // triggered effect gets. It records THAT the effect resolved and leaves the wording to
      // the overlay: repeating the description here would print the same sentence twice on
      // screen at the same moment, and the log cannot narrow a raw engine description down
      // to the printed clause the way the overlay does.
      return {
        text: t("log.effectResolved", { card: cardName(event.sourceCardId) }),
        kind: "sys",
        cardIds: [event.sourceCardId],
      };
    case "cardsMoved": {
      if (event.turnEndDeletion !== undefined) {
        const { sourceCardId, deletedCardId } = event.turnEndDeletion;
        return {
          text: t("log.turnEndDeletion", { card: cardName(deletedCardId), source: cardName(sourceCardId) }),
          kind: "sys",
          cardIds: [deletedCardId, sourceCardId],
        };
      }
      const from = logZoneLabel(event.from, t);
      const to = logZoneLabel(event.to, t);
      // A single move is the case worth naming; several cards would push the names past
      // what one log line can carry. `cardsMoved` publishes no identity of its own, so this
      // name comes from wherever the card is now — the line falls back to the count once
      // nothing on the board can identify that instance any more.
      const movedCardId = event.instanceIds.length === 1 ? identities.get(event.instanceIds[0]!) : undefined;
      if (movedCardId !== undefined) {
        return {
          text: t("log.cardMovedNamed", { card: cardName(movedCardId), from, to }),
          kind: "sys",
          cardIds: [movedCardId],
        };
      }
      return {
        text: t(event.instanceIds.length === 1 ? "log.cardMoved" : "log.cardsMoved", {
          count: event.instanceIds.length,
          from,
          to,
        }),
        kind: "sys",
      };
    }
    case "gameOver": {
      if (event.result.outcome === "draw") {
        return { text: t("log.gameOverDraw", { reason: event.reason }), kind: "sys" };
      }
      const won = event.result.winnerSeat === viewerSeat;
      return {
        text: t(won ? "log.gameOverWin" : "log.gameOverLoss", { reason: event.reason }),
        kind: won ? "you" : "opp",
      };
    }
    case "actionRejected":
      return null; // surfaced as a transient toast instead of a log line
    default:
      return null;
  }
}
