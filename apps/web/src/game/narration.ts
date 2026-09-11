/* Narration: one moment at a time.

   A notice and a side panel used to be two independent stacks, each with its own
   timer and its own screen cap, so a deleted-cards panel and the `[On Deletion]`
   clause that emptied the slot arrived in the same second and fought for the same
   column. They are one thing to read, so they are one item here — and the
   animation queue presents items one at a time per slot instead of letting them
   pile up (docs/presentation-queue-plan.md §3.2).

   This module is the pure half: what an item is, what folds into one item, how
   long it gets to be read, and which slot presents it. The queue steps and the
   React state live in useMatchCues.ts; the drawing lives in NarrationStack.tsx. */

import { NOTICE_LIFETIME_MS, type MatchNotice, type NoticeSide } from "./notices";
import { pushSidePanel, SIDE_PANEL_LIFETIME_MS, type SidePanel } from "./sidePanels";

export type NarrationSide = NoticeSide;

/**
 * Where an item is presented. A portrait phone has one centred slot, because four
 * corners on a 390px screen put a notice on the hand or the field being read;
 * everything else keeps the viewer's corner and the opponent's corner, one item
 * each (plan §6 decision 1).
 */
export type NarrationSlot = "narration" | "narration-you" | "narration-opp";

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

/** Which slot presents this item, given whether the layout has folded them into one. */
export function narrationSlot(item: Pick<NarrationItem, "side">, collapsed: boolean): NarrationSlot {
  if (collapsed) return "narration";
  return item.side === "you" ? "narration-you" : "narration-opp";
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
    if (host) {
      host.notice = notice;
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
