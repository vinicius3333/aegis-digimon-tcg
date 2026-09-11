/* The match screen's one notice system: the framed call-outs that used to be a
   rejection flash, a recovery toast and an effect-clause toast, each with its
   own placement and its own timer.

   A notice no longer owns a corner or a clock of its own. It is half of a
   narration item (narration.ts), and the animation queue presents one item at a
   time per slot: the viewer's side, the opponent's side, or the phone's single
   centred slot. A refused action is the exception — it answers the viewer's own
   tap, so it is shown at once rather than queued.

   This module is the pure half: the model and the mapping from server events.
   Card text and translation belong to NoticeStack.tsx. */

import { digiXrosRequirementFor, type Seat, type ServerEvent } from "@aegis/shared";
import { TIMINGS } from "./timings";

/** How long a notice gets to be read. Nothing on the board shortens it any more. */
export const NOTICE_LIFETIME_MS = TIMINGS.noticeLifetime;

/**
 * How long a refusal gets. It is the one notice that is not queued, so its clock starts at
 * the refusal itself rather than when a slot reaches it: the player is still watching the
 * card they tapped shake, and a refusal is a sentence to read rather than a card to
 * recognise. It therefore takes the longer clock the opponent feed gives a line carrying
 * text, not the queued notice's.
 */
export const REJECTION_LIFETIME_MS = TIMINGS.feedEffect;

export type NoticeSide = "you" | "opp";

export type NoticeBody =
  | { variant: "effect"; cardId: string; timing?: string; description?: string; isInherited?: boolean }
  | { variant: "recovery"; amount: number }
  | { variant: "securityGain"; amount: number }
  | { variant: "rejection"; reason: string }
  | { variant: "keyword"; keyword: NoticeKeyword; cardId: string };

/** The named mechanics the board calls out by name as they happen. */
export type NoticeKeyword = "digiXros" | "cannotAttack" | "cannotBlock";

export type NoticeVariant = NoticeBody["variant"];

export interface MatchNotice {
  id: string;
  side: NoticeSide;
  /** Raised while a security card was resolving. Provenance only: it no longer moves the notice. */
  fromSecurity: boolean;
  body: NoticeBody;
  createdAt: number;
}

function sideOf(seat: Seat, viewerSeat: Seat): NoticeSide {
  return seat === viewerSeat ? "you" : "opp";
}

/**
 * The notice an effect deserves as it starts resolving, for either seat.
 * Driven by `effectTriggered` rather than `effectResolved`, so the clause is
 * readable before any selection the effect asks its controller for.
 */
export function effectNoticeFromEvent(
  event: ServerEvent,
  viewerSeat: Seat,
  id: string,
  nowMs: number,
  fromSecurity = false,
): MatchNotice | null {
  if (event.kind !== "effectTriggered") return null;
  return {
    id,
    side: sideOf(event.seat, viewerSeat),
    fromSecurity: fromSecurity || event.duringSecurityCheck === true,
    body: {
      variant: "effect",
      cardId: event.sourceCardId,
      timing: event.timing,
      description: event.description,
      isInherited: event.isInherited,
    },
    createdAt: nowMs,
  };
}

/** The notice a security recovery deserves, on the recovering player's side. */
export function recoveryNoticeFromEvent(
  event: ServerEvent,
  viewerSeat: Seat,
  id: string,
  nowMs: number,
): MatchNotice | null {
  if (event.kind !== "securityRecovered") return null;
  return {
    id,
    side: sideOf(event.seat, viewerSeat),
    fromSecurity: false,
    body: { variant: "recovery", amount: event.amount },
    createdAt: nowMs,
  };
}

/**
 * The notice a security stack deserves when an effect adds to it outside a recovery —
 * a card placed there from the hand, the deck or the trash. The stack is face-down,
 * so the notice carries only the count; on the stacking player's side.
 */
export function securityGainNotice(side: NoticeSide, amount: number, id: string, nowMs: number): MatchNotice {
  return { id, side, fromSecurity: false, body: { variant: "securityGain", amount }, createdAt: nowMs };
}

/**
 * The same notice, read off the movement itself when the server names the seat whose
 * stack grew. The count alone cannot narrate an add that the same patch undoes — "place
 * 1 card from your hand as the bottom security card, then trash your top security card"
 * (BT24-016) leaves the count where it was — so the event is the source of truth and
 * the count watcher is the fallback for a movement that names no seat. A recovery's
 * movement names none: `securityRecovered` narrates that growth.
 */
export function securityGainNoticeFromEvent(
  event: ServerEvent,
  viewerSeat: Seat,
  id: string,
  nowMs: number,
): MatchNotice | null {
  if (event.kind !== "cardsMoved" || event.to !== "security" || event.seat === undefined) return null;
  if (event.instanceIds.length === 0) return null;
  return securityGainNotice(sideOf(event.seat, viewerSeat), event.instanceIds.length, id, nowMs);
}

/**
 * The call-out a named mechanic earns as it happens, for either seat.
 *
 * The mechanic has to be identifiable from the event alone: a played card whose
 * definition carries a DigiXros requirement was DigiXrosed, because that is the
 * only way the server lets such a card reach the field. Nothing else in the
 * protocol names its mechanic, so nothing else is called out — a client that
 * guessed would be inventing rules (ARCHITECTURE.md §4).
 */
export function keywordNoticeFromEvent(
  event: ServerEvent,
  viewerSeat: Seat,
  id: string,
  nowMs: number,
): MatchNotice | null {
  if (event.kind !== "cardPlayed") return null;
  if ((digiXrosRequirementFor(event.cardId)?.length ?? 0) === 0) return null;
  return {
    id,
    side: sideOf(event.seat, viewerSeat),
    fromSecurity: false,
    body: { variant: "keyword", keyword: "digiXros", cardId: event.cardId },
    createdAt: nowMs,
  };
}

/** A refused action is always the viewer's own, so it lands on the viewer's side. */
export function rejectionNotice(reason: string, id: string, nowMs: number): MatchNotice {
  return { id, side: "you", fromSecurity: false, body: { variant: "rejection", reason }, createdAt: nowMs };
}

/** Milliseconds left on a notice's clock, never negative. */
export function noticeRemaining(notice: MatchNotice, nowMs: number): number {
  const lifetime = notice.body.variant === "rejection" ? REJECTION_LIFETIME_MS : NOTICE_LIFETIME_MS;
  return Math.max(0, notice.createdAt + lifetime - nowMs);
}

/**
 * True for the viewer's own effect notice for `cardId`.
 *
 * The decision dialog that asks the viewer whether to activate their own effect already
 * names the card and prints the clause, so the notice would repeat it word for word.
 * The opponent's notices stay: their dialog is not on this screen.
 */
export function isOwnEffectNotice(notice: MatchNotice, cardId: string): boolean {
  return notice.side === "you" && notice.body.variant === "effect" && notice.body.cardId === cardId;
}
