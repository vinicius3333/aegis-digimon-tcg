/* Recent narration combines the effect clause and its card panel when they describe
   the same moment. The animation queue publishes each item at the correct beat;
   useMatchCues expires it independently while subsequent actions continue. */

import { NOTICE_LIFETIME_MS, type MatchNotice, type NoticeSide } from "./notices";
import { pushSidePanel, SIDE_PANEL_LIFETIME_MS, type SidePanel } from "./sidePanels";

export type NarrationSide = NoticeSide;

/**
 * Where an item is presented. The board reads in two columns, split by what a moment is
 * rather than by whose moment it is: a clause to read on the left, the cards a moment
 * moved on the right. Both players' moments share both columns, so the eye always looks
 * in the same place for the same kind of thing. A portrait phone folds them into one
 * centred slot, because two columns on a 390px screen put a moment on the hand or on the
 * field being read.
 */
export type NarrationSlot = "narration" | "narration-text" | "narration-cards";

export interface NarrationItem {
  id: string;
  side: NarrationSide;
  /** The server batch this moment belongs to. */
  batchId: string;
  /** The card the moment is about, when both halves can name the same one. */
  source?: string;
  /** When the item was presented, which is when its reading clock started. */
  createdAt: number;
  panel?: SidePanel;
  notice?: MatchNotice;
}

/**
 * How often a presented item's clock is checked. It is sliced rather than waited out
 * in one go so a decision the viewer has to answer can stop the clock where it is and
 * give the rest of the reading time back on release.
 */
export const NARRATION_TICK_MS = 120;

/**
 * A refused action answers the viewer's own tap, so it is shown at once and never
 * waits behind a queue the viewer is trying to act on.
 */
export function isQueuedNotice(notice: MatchNotice): boolean {
  return notice.body.variant !== "rejection";
}

/** The card a notice is about, when it names one. */
export function noticeSourceCardId(notice: MatchNotice): string | undefined {
  const { body } = notice;
  if (body.variant === "effect" || body.variant === "keyword") return body.cardId;
  // A deletion that took several permanents is about the effect, not about any one of
  // them, so it names a source only when it took exactly one.
  if (body.variant === "deletion") return body.cards.length === 1 ? body.cards[0]?.cardId : undefined;
  return undefined;
}

/**
 * The card a panel is about. Only a panel listing exactly one card names a source: a
 * panel of four revealed cards is about the effect, not about any one of them, and
 * folding a clause into it would claim a card it never named.
 */
export function panelSourceCardId(panel: SidePanel): string | undefined {
  return panel.cards.length === 1 ? panel.cards[0]?.cardId : undefined;
}

/** How long an item gets to be read. An item carrying both halves gets the longer clock. */
export function narrationReadingTime(item: Pick<NarrationItem, "panel" | "notice">): number {
  return Math.max(item.notice ? NOTICE_LIFETIME_MS : 0, item.panel ? SIDE_PANEL_LIFETIME_MS : 0);
}

/** Milliseconds left on a presented item's clock, never negative. */
export function narrationRemaining(item: NarrationItem, nowMs: number): number {
  return Math.max(0, item.createdAt + narrationReadingTime(item) - nowMs);
}

/**
 * A notice that names cards rather than reading as a sentence. It belongs with the card
 * lists on the right, not with the clauses on the left.
 */
export function isCardListNotice(notice: MatchNotice): boolean {
  return notice.body.variant === "deletion";
}

/**
 * Every column this item appears in. A moment carrying both a clause and the cards it
 * moved is read in both: the clause on the left, the list on the right.
 */
export function narrationSlots(item: Pick<NarrationItem, "panel" | "notice">, collapsed: boolean): NarrationSlot[] {
  if (collapsed) return ["narration"];
  const slots: NarrationSlot[] = [];
  if (item.notice && !isCardListNotice(item.notice)) slots.push("narration-text");
  if (item.panel || (item.notice && isCardListNotice(item.notice))) slots.push("narration-cards");
  return slots;
}

/** The column an item leads with, for callers that only need one. */
export function narrationSlot(item: Pick<NarrationItem, "panel" | "notice">, collapsed: boolean): NarrationSlot {
  return narrationSlots(item, collapsed)[0] ?? (collapsed ? "narration" : "narration-text");
}

/**
 * The presented items after `shown` arrives, with every column it lands in trimmed to
 * `limit`.
 *
 * A column is a FIFO of its own, so the item pushed out is the oldest one **in the same
 * column**. One cap shared across the whole screen let a card list evict the clause that
 * explained it; folded into the phone's single slot, everything queues together again.
 */
/** Every column trimmed to `limit`, oldest first. */
export function trimNarration(
  items: ReadonlyMap<string, NarrationItem>,
  limit: number,
  collapsed: boolean,
): Map<string, NarrationItem> {
  const next = new Map(items);
  const slots = new Set([...next.values()].flatMap((item) => narrationSlots(item, collapsed)));
  for (const slot of slots) {
    const inSlot = [...next.values()].filter((item) => narrationSlots(item, collapsed).includes(slot));
    for (const evicted of inSlot.slice(0, Math.max(0, inSlot.length - limit))) next.delete(evicted.id);
  }
  return next;
}

export function pushNarrationItem(
  items: ReadonlyMap<string, NarrationItem>,
  shown: NarrationItem,
  limit: number,
  collapsed: boolean,
): Map<string, NarrationItem> {
  const next = new Map([...items, [shown.id, shown] as const]);
  for (const slot of narrationSlots(shown, collapsed)) {
    const inSlot = [...next.values()].filter((item) => narrationSlots(item, collapsed).includes(slot));
    for (const evicted of inSlot.slice(0, Math.max(0, inSlot.length - limit))) next.delete(evicted.id);
  }
  return next;
}

/**
 * The items one server batch earns, in the order they are presented.
 *
 * A panel and a notice of the same side about the same card are one moment, and the
 * notice is the half that carries the clause, so anything with a clause is read out
 * before a bare list of cards: the explanation, then what it did. Cards moved by one
 * effect merge into a single panel first, on `sidePanelMergeWindow`, so "your opponent
 * trashes 3 cards" stays one item rather than three.
 */
export function buildNarrationItems({
  batchId,
  notices,
  panels,
  nowMs,
  nextId,
  mergeWindowMs,
}: {
  batchId: string;
  notices: readonly MatchNotice[];
  panels: readonly SidePanel[];
  nowMs: number;
  nextId: () => string;
  mergeWindowMs?: number;
}): NarrationItem[] {
  const merged = panels.reduce<readonly SidePanel[]>((stack, panel) => pushSidePanel(stack, panel, mergeWindowMs), []);
  const items: NarrationItem[] = merged.map((panel) => {
    const source = panelSourceCardId(panel);
    return {
      id: nextId(),
      side: panel.side,
      batchId,
      ...(source ? { source } : {}),
      createdAt: nowMs,
      panel,
    };
  });
  for (const notice of notices) {
    if (!isQueuedNotice(notice)) continue;
    const source = noticeSourceCardId(notice);
    const host = source
      ? items.find((item) => item.notice === undefined && item.side === notice.side && item.source === source)
      : undefined;
    // A reveal and its sole effect clause in the same server batch describe
    // one result. Keep them together when the layout has only one slot.
    const revealHost =
      !host &&
      notice.body.variant === "effect" &&
      notices.filter((candidate) => candidate.side === notice.side && candidate.body.variant === "effect").length === 1
        ? items.find(
            (item) =>
              item.notice === undefined && item.side === notice.side && item.panel?.titleKey === "panel.revealedCards",
          )
        : undefined;
    const combined = host ?? revealHost;
    if (combined) {
      combined.notice = notice;
      if (revealHost) combined.source = source;
      continue;
    }
    items.push({
      id: nextId(),
      side: notice.side,
      batchId,
      ...(source ? { source } : {}),
      createdAt: nowMs,
      notice,
    });
  }
  // Stable, so the order inside each group is still the order the batch named them in.
  return [...items.filter((item) => item.notice !== undefined), ...items.filter((item) => item.notice === undefined)];
}
