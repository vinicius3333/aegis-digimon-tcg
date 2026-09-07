/* Timed side panels, ported from the reference client's right-hand stack.
   Whenever cards move in a way the player must see — discarded, deleted,
   revealed, added to hand, put under a stack — the reference client opens a
   small titled panel listing the cards and leaves it up long enough to read,
   its border eroding clockwise as the clock runs out.

   A play normally opens no panel: the opponent's played card is already held up
   centre-screen by the zone showcase, so a panel only said the same thing again
   in a corner the player had to look away to read. The showcase is pure motion,
   though, so reduced motion and a hidden tab drop it — and there the panel is the
   only thing that announces the play at all, which is what `showcasePlays` decides.

   This module is the pure half: it maps observed server events to panel
   descriptors and owns the titling, stacking, merging and expiry rules. Titles
   come from the movement's zones alone — the client reads no rules to decide
   what a movement meant. Card identities and ownership are supplied by the
   caller through `SidePanelLookup`, because `cardsMoved` carries only instance
   ids.

   Every panel gets the same fixed reading time, exactly as the reference client
   does: the clock a panel starts with is never shortened by anything that
   happens afterwards, so a panel always leaves on its own schedule. */

import type { GameState, Seat, ServerEvent } from "@aegis/shared";
import type { TranslationKey } from "../i18n";
import { TIMINGS } from "./timings";

/**
 * The reference client's Effects.HideShowCard waits 2.5 s, then runs a second 2.5 s
 * accumulator before closing the panel — about five seconds of reading time. It
 * is started without being awaited, so the panel never blocks the game.
 */
export const SIDE_PANEL_LIFETIME_MS = TIMINGS.sidePanelLifetime;

/**
 * the reference client has no attack banner at all — it announces an attack with outlines, a
 * target arrow and the suspend animation. This call-out is an addition, so it
 * takes the length of the reference client's other banners (ShowPhaseNotificationObject holds
 * for 0.3 s inside a ~0.25 s open/close pair) rounded up to a readable glance.
 */
export const ATTACK_ANNOUNCE_MS = TIMINGS.attackAnnounce;

/** Two panels fit in one column without covering the board. */
export const MAX_VISIBLE_SIDE_PANELS = 2;

/** Cards moved in quick succession belong to one panel, numbered 1..n. */
export const SIDE_PANEL_MERGE_WINDOW_MS = TIMINGS.sidePanelMergeWindow;

export type SidePanelSide = "you" | "opp";

export interface SidePanelCard {
  cardId: string;
  badge: number;
}

export interface SidePanel {
  id: string;
  titleKey: TranslationKey;
  side: SidePanelSide;
  cards: SidePanelCard[];
  /** The event put its cards in a meaningful order, so every card wears its number. */
  ordered: boolean;
  createdAt: number;
}

export interface AttackAnnouncement {
  id: string;
  cardId: string;
  side: SidePanelSide;
  createdAt: number;
}

/** Resolves the instance ids carried by `cardsMoved` into identities the panel can show. */
export interface SidePanelLookup {
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

/**
 * The panel title a movement earns, read off its zones only. `deckBottom` and
 * `selected` are destinations the protocol may name for an ordering or a
 * selection; a plain `deck` destination stays unqualified because the event
 * carries no position and the client may not infer one.
 */
export function titleForMovement(from: string, to: string): TranslationKey | null {
  switch (to) {
    case "trash":
      return trashTitle(from);
    case "hand":
      return "panel.cardsAddedToHand";
    case "deckBottom":
      return "panel.deckBottomCard";
    case "deck":
      return "panel.deckCards";
    case "selected":
      return "panel.selectedCards";
    case "stackBottom":
      return "panel.digivolutionCards";
    default:
      return null;
  }
}

function sideOf(seat: Seat, viewerSeat: Seat): SidePanelSide {
  return seat === viewerSeat ? "you" : "opp";
}

function numbered(cardIds: readonly string[]): SidePanelCard[] {
  return cardIds.map((cardId, index) => ({ cardId, badge: index + 1 }));
}

/**
 * The panel an event deserves, or null when the event opens none. A movement
 * whose cards cannot be identified yields null rather than an empty panel.
 *
 * `showcasePlays` is whether the centre-stage zone showcase will actually play for
 * this viewer; it decides only whether a play needs announcing here instead.
 */
export function sidePanelFromEvent(
  event: ServerEvent,
  viewerSeat: Seat,
  lookup: SidePanelLookup,
  id: string,
  nowMs: number,
  showcasePlays = true,
): SidePanel | null {
  switch (event.kind) {
    case "cardsMoved": {
      const titleKey = titleForMovement(event.from, event.to);
      if (!titleKey) return null;
      // The event's own identities first: the index can be one state patch behind
      // the movement the event narrates (see securityDestructionsFromEvents).
      const cardIds = event.instanceIds.flatMap((instanceId, index) => {
        const cardId = event.cardIds?.[index] ?? lookup.cardId(instanceId);
        return cardId ? [cardId] : [];
      });
      if (cardIds.length === 0) return null;
      const owner =
        event.seat ?? event.instanceIds.map((instanceId) => lookup.seat(instanceId)).find((s) => s !== undefined);
      if (owner === undefined) return null;
      return {
        id,
        titleKey,
        side: sideOf(owner, viewerSeat),
        cards: numbered(cardIds),
        ordered: cardIds.length > 1,
        createdAt: nowMs,
      };
    }
    case "cardRevealed":
      // A reveal exists to inform the other player; the revealer's own client
      // already shows the card through the zone it came from or moves to.
      if (event.seat === viewerSeat) return null;
      return {
        id,
        titleKey: "panel.revealedCards",
        side: "opp",
        cards: numbered([event.cardId]),
        // A reveal is shown in the order it came off the deck, so it is numbered
        // from the first card even before a second one joins it.
        ordered: true,
        createdAt: nowMs,
      };
    case "cardPlayed":
      // Only the opponent's play needs announcing; the viewer just made theirs.
      if (event.seat === viewerSeat) return null;
      // The showcase, when it plays, already holds this card up centre-screen.
      if (showcasePlays) return null;
      return {
        id,
        titleKey: "panel.playedCard",
        side: "opp",
        cards: numbered([event.cardId]),
        ordered: false,
        createdAt: nowMs,
      };
    case "digivolved":
      if (event.seat === viewerSeat) return null;
      // A breeding digivolution is held up centre-screen by the same showcase as a play,
      // which says everything this panel would; a battle-area one only changes a stack in
      // place, so it keeps its panel either way.
      if (event.inBreeding && showcasePlays) return null;
      return {
        id,
        titleKey: "panel.digivolutionCards",
        side: "opp",
        cards: numbered([event.cardId]),
        ordered: false,
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

function sameSlot(a: SidePanel, b: SidePanel): boolean {
  return a.titleKey === b.titleKey && a.side === b.side;
}

/**
 * Add a panel to the stack. A panel of the same title and side that is still
 * fresh absorbs the new cards and keeps counting from its own badge numbers;
 * an older one is replaced outright. Each side never grows past
 * MAX_VISIBLE_SIDE_PANELS — the oldest panel on that side makes room.
 */
export function pushSidePanel(
  panels: readonly SidePanel[],
  incoming: SidePanel,
  mergeWindowMs = SIDE_PANEL_MERGE_WINDOW_MS,
): SidePanel[] {
  const existing = panels.find((panel) => sameSlot(panel, incoming));
  if (existing) {
    const merged =
      incoming.createdAt - existing.createdAt <= mergeWindowMs
        ? {
            ...incoming,
            cards: numbered([...existing.cards, ...incoming.cards].map((card) => card.cardId)),
            ordered: existing.ordered || incoming.ordered,
          }
        : incoming;
    return panels.map((panel) => (panel === existing ? merged : panel));
  }
  const sameSide = panels.filter((panel) => panel.side === incoming.side);
  const dropped = sameSide.length >= MAX_VISIBLE_SIDE_PANELS ? sameSide[0] : undefined;
  return [...panels.filter((panel) => panel !== dropped), incoming];
}

/** Milliseconds left on a panel's own clock, never negative. */
export function sidePanelRemaining(panel: SidePanel, nowMs: number): number {
  return Math.max(0, panel.createdAt + SIDE_PANEL_LIFETIME_MS - nowMs);
}

/** Drop panels whose reading time has elapsed. */
export function expireSidePanels(panels: readonly SidePanel[], nowMs: number): SidePanel[] {
  return panels.filter((panel) => sidePanelRemaining(panel, nowMs) > 0);
}

/** The soonest a panel in the stack will expire, or null when the stack is empty. */
export function nextSidePanelExpiry(panels: readonly SidePanel[], nowMs: number): number | null {
  if (panels.length === 0) return null;
  return Math.min(...panels.map((panel) => sidePanelRemaining(panel, nowMs)));
}

export function dismissSidePanel(panels: readonly SidePanel[], id: string): SidePanel[] {
  return panels.filter((panel) => panel.id !== id);
}

/** The panels belonging to one column, oldest first. */
export function sidePanelColumn(panels: readonly SidePanel[], side: SidePanelSide): SidePanel[] {
  return panels.filter((panel) => panel.side === side).sort((a, b) => a.createdAt - b.createdAt);
}
