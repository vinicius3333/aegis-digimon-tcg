/* Transient card-information panels, ported from the reference client's right-hand stack.
   Whenever cards move in a way the player must see — discarded, deleted,
   revealed, played — the reference client opens a small titled panel listing the cards with
   numbered badges and leaves it up long enough to read.

   This module is the pure half: it maps observed server events to panel
   descriptors and owns the stacking, merging and expiry rules. Card identities
   and ownership are supplied by the caller through `InfoPanelLookup`, because
   `cardsMoved` carries only instance ids. */

import type { GameState, Seat, ServerEvent } from "@aegis/shared";
import type { TranslationKey } from "../i18n";

/**
 * the reference client's Effects.HideShowCard waits 2.5 s, then runs a second 2.5 s accumulator
 * before closing the panel — about five seconds of reading time. It is started
 * without being awaited, so the panel never blocks the game.
 */
export const INFO_PANEL_LIFETIME_MS = 5000;

/**
 * the reference client has no attack banner at all — it announces an attack with outlines, a
 * target arrow and the suspend animation. This call-out is an addition, so it
 * takes the length of the reference client's other banners (ShowPhaseNotificationObject holds
 * for 0.3 s inside a ~0.25 s open/close pair) rounded up to a readable glance.
 */
export const ATTACK_ANNOUNCE_MS = 1200;

/** Two panels fit beside the field without covering the board. */
export const MAX_VISIBLE_INFO_PANELS = 2;

/** Cards moved in quick succession belong to one panel, numbered 1..n. */
export const INFO_PANEL_MERGE_WINDOW_MS = 1500;

export type InfoPanelSide = "you" | "opp";

export interface InfoPanelCard {
  cardId: string;
  badge: number;
}

export interface InfoPanel {
  id: string;
  titleKey: TranslationKey;
  side: InfoPanelSide;
  cards: InfoPanelCard[];
  createdAt: number;
}

export interface AttackAnnouncement {
  id: string;
  cardId: string;
  side: InfoPanelSide;
  createdAt: number;
}

/** Resolves the instance ids carried by `cardsMoved` into identities the panel can show. */
export interface InfoPanelLookup {
  cardId: (instanceId: string) => string | undefined;
  seat: (instanceId: string) => Seat | undefined;
}

/**
 * Owner seat for every publicly visible card instance. Trash is public for both
 * seats, so a card that has just been discarded or deleted resolves here even
 * though `cardsMoved` names no seat.
 */
export function buildInstanceSeatIndex(state: GameState): Map<string, Seat> {
  const index = new Map<string, Seat>();
  state.players.forEach((player, playerSeat) => {
    const seat = playerSeat as Seat;
    const add = (instanceId?: string) => {
      if (instanceId) index.set(instanceId, seat);
    };
    player.trash?.forEach((card) => add(card?.instanceId));
    const addPermanent = (permanent?: { permanentId?: string; topCard?: { instanceId?: string } }) => {
      if (!permanent) return;
      add(permanent.permanentId);
      add(permanent.topCard?.instanceId);
    };
    player.battleArea?.forEach(addPermanent);
    addPermanent(player.breeding);
    if (player.hand) player.hand.forEach((card) => add(card?.instanceId));
  });
  return index;
}

function trashTitle(from: string): TranslationKey | null {
  switch (from) {
    case "hand":
      return "panel.discardedCards";
    case "battleArea":
    case "breeding":
      return "panel.deletedCards";
    case "deck":
    case "security":
    case "eggDeck":
    case "delay":
    case "various":
      return "panel.trashedCards";
    default:
      return null;
  }
}

function sideOf(seat: Seat, viewerSeat: Seat): InfoPanelSide {
  return seat === viewerSeat ? "you" : "opp";
}

function numbered(cardIds: readonly string[]): InfoPanelCard[] {
  return cardIds.map((cardId, index) => ({ cardId, badge: index + 1 }));
}

/**
 * The panel an event deserves, or null when the event opens none. A movement
 * whose cards cannot be identified yields null rather than an empty panel.
 */
export function infoPanelFromEvent(
  event: ServerEvent,
  viewerSeat: Seat,
  lookup: InfoPanelLookup,
  id: string,
  nowMs: number,
): InfoPanel | null {
  switch (event.kind) {
    case "cardsMoved": {
      if (event.to !== "trash") return null;
      const titleKey = trashTitle(event.from);
      if (!titleKey) return null;
      const cardIds = event.instanceIds.flatMap((instanceId) => {
        const cardId = lookup.cardId(instanceId);
        return cardId ? [cardId] : [];
      });
      if (cardIds.length === 0) return null;
      const owner = event.instanceIds.map((instanceId) => lookup.seat(instanceId)).find((s) => s !== undefined);
      if (owner === undefined) return null;
      return { id, titleKey, side: sideOf(owner, viewerSeat), cards: numbered(cardIds), createdAt: nowMs };
    }
    case "cardRevealed":
      return {
        id,
        titleKey: "panel.revealedCards",
        side: sideOf(event.seat, viewerSeat),
        cards: numbered([event.cardId]),
        createdAt: nowMs,
      };
    case "cardPlayed":
      // Only the opponent's play needs announcing; the viewer just made theirs.
      if (event.seat === viewerSeat) return null;
      return {
        id,
        titleKey: "panel.playedCard",
        side: "opp",
        cards: numbered([event.cardId]),
        createdAt: nowMs,
      };
    default:
      return null;
  }
}

/** The attack call-out an event deserves, for either seat. */
export function attackAnnouncementFromEvent(
  event: ServerEvent,
  viewerSeat: Seat,
  id: string,
  nowMs: number,
): AttackAnnouncement | null {
  if (event.kind !== "attackDeclared") return null;
  return { id, cardId: event.attackerCardId, side: sideOf(event.seat, viewerSeat), createdAt: nowMs };
}

function sameSlot(a: InfoPanel, b: InfoPanel): boolean {
  return a.titleKey === b.titleKey && a.side === b.side;
}

/**
 * Add a panel to the stack. A panel of the same title and side that is still
 * fresh absorbs the new cards and keeps counting from its own badge numbers;
 * an older one is replaced outright. The stack never grows past
 * MAX_VISIBLE_INFO_PANELS — the oldest panel makes room.
 */
export function pushInfoPanel(
  panels: readonly InfoPanel[],
  incoming: InfoPanel,
  mergeWindowMs = INFO_PANEL_MERGE_WINDOW_MS,
): InfoPanel[] {
  const existing = panels.find((panel) => sameSlot(panel, incoming));
  if (existing) {
    const merged =
      incoming.createdAt - existing.createdAt <= mergeWindowMs
        ? {
            ...incoming,
            cards: numbered([...existing.cards, ...incoming.cards].map((card) => card.cardId)),
          }
        : incoming;
    return panels.map((panel) => (panel === existing ? merged : panel));
  }
  return [...panels, incoming].slice(-MAX_VISIBLE_INFO_PANELS);
}

/** Drop panels whose reading time has elapsed. */
export function expireInfoPanels(
  panels: readonly InfoPanel[],
  nowMs: number,
  lifetimeMs = INFO_PANEL_LIFETIME_MS,
): InfoPanel[] {
  return panels.filter((panel) => nowMs - panel.createdAt < lifetimeMs);
}

export function dismissInfoPanel(panels: readonly InfoPanel[], id: string): InfoPanel[] {
  return panels.filter((panel) => panel.id !== id);
}

/** Opponent panels sit above the viewer's, matching the reference client's upper/lower split. */
export function orderInfoPanels(panels: readonly InfoPanel[]): InfoPanel[] {
  const rank = (panel: InfoPanel) => (panel.side === "opp" ? 0 : 1);
  return [...panels].sort((a, b) => rank(a) - rank(b) || a.createdAt - b.createdAt);
}
