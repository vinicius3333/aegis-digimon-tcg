/* The match screen's one notice system: the framed call-outs that used to be a
   rejection flash, a recovery toast and an effect-clause toast, each with its
   own placement and its own timer.

   A notice is anchored by whose moment it is — the viewer's effects sit
   bottom-left, the opponent's top-right — so a glance at the corner says whose
   turn to read it is. The opponent's corner is the right one because the
   opponent's action feed and card panels own the board's left edge, where they
   sit clear of the half of the field the opponent plays into.

   A notice raised while a security card resolves mirrors to
   the side opposite the panel stack, because the revealed card and its panels
   already own that half of the screen.

   This module is the pure half: the model, the anchoring, and the stacking and
   expiry rules. Card text and translation belong to NoticeStack.tsx. */

import { digiXrosRequirementFor, type Seat, type ServerEvent } from "@aegis/shared";
import { TIMINGS } from "./timings";

/** How long a notice stays readable on its own. */
export const NOTICE_LIFETIME_MS = TIMINGS.noticeLifetime;

/** A crowded stack disperses on this shorter clock instead. */
export const NOTICE_CROWDED_LIFETIME_MS = TIMINGS.noticeCrowdedLifetime;

/** Three notices at once is the point where the stack starts clearing itself faster. */
export const NOTICE_CROWDED_AT = 3;

/** Beyond this the oldest notice is dropped rather than shrinking the type. */
export const MAX_VISIBLE_NOTICES = 3;

export type NoticeSide = "you" | "opp";
export type NoticeVertical = "top" | "middle" | "bottom";
export type NoticeHorizontal = "left" | "right";
export type NoticeAnchor = `${NoticeVertical}-${NoticeHorizontal}`;

export type NoticeBody =
  | { variant: "effect"; cardId: string; timing?: string; description?: string }
  | { variant: "recovery"; amount: number }
  | { variant: "rejection"; reason: string }
  | { variant: "keyword"; keyword: NoticeKeyword; cardId: string };

/** The named mechanics the board calls out by name as they happen. */
export type NoticeKeyword = "digiXros" | "cannotAttack" | "cannotBlock";

export type NoticeVariant = NoticeBody["variant"];

export interface MatchNotice {
  id: string;
  side: NoticeSide;
  /** Raised while a security card was resolving, so it mirrors away from the panels. */
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
    fromSecurity,
    body: { variant: "effect", cardId: event.sourceCardId, timing: event.timing, description: event.description },
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

/**
 * Where a notice sits. The viewer reads from the bottom-left and the opponent's
 * moments arrive top-right, clear of the opponent feed and panels on the left;
 * anything a security card raised mirrors to the half the panel stack does not
 * occupy.
 */
export function noticeAnchor(notice: MatchNotice, panelSide: NoticeHorizontal = "right"): NoticeAnchor {
  if (notice.fromSecurity) return `middle-${panelSide === "right" ? "left" : "right"}`;
  return notice.side === "you" ? "bottom-left" : "top-right";
}

/** How long a notice gets to be read, given how many share the screen. */
export function noticeLifetime(stackSize: number): number {
  return stackSize >= NOTICE_CROWDED_AT ? NOTICE_CROWDED_LIFETIME_MS : NOTICE_LIFETIME_MS;
}

/** Milliseconds left on a notice's clock, never negative. */
export function noticeRemaining(notices: readonly MatchNotice[], notice: MatchNotice, nowMs: number): number {
  return Math.max(0, notice.createdAt + noticeLifetime(notices.length) - nowMs);
}

export function pushNotice(notices: readonly MatchNotice[], incoming: MatchNotice): MatchNotice[] {
  return [...notices, incoming].slice(-MAX_VISIBLE_NOTICES);
}

export function expireNotices(notices: readonly MatchNotice[], nowMs: number): MatchNotice[] {
  return notices.filter((notice) => noticeRemaining(notices, notice, nowMs) > 0);
}

/** The soonest a notice in the stack will expire, or null when the stack is empty. */
export function nextNoticeExpiry(notices: readonly MatchNotice[], nowMs: number): number | null {
  if (notices.length === 0) return null;
  return Math.min(...notices.map((notice) => noticeRemaining(notices, notice, nowMs)));
}

export function dismissNotice(notices: readonly MatchNotice[], id: string): MatchNotice[] {
  return notices.filter((notice) => notice.id !== id);
}

/** The notices sharing one anchor, oldest first — which is how they stack. */
export function noticesAt(
  notices: readonly MatchNotice[],
  anchor: NoticeAnchor,
  panelSide: NoticeHorizontal = "right",
): MatchNotice[] {
  return notices
    .filter((notice) => noticeAnchor(notice, panelSide) === anchor)
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** Every anchor the stack currently occupies, in a stable order. */
export function occupiedAnchors(
  notices: readonly MatchNotice[],
  panelSide: NoticeHorizontal = "right",
): NoticeAnchor[] {
  const order: NoticeAnchor[] = ["top-left", "middle-left", "bottom-left", "top-right", "middle-right", "bottom-right"];
  const present = new Set(notices.map((notice) => noticeAnchor(notice, panelSide)));
  return order.filter((anchor) => present.has(anchor));
}
