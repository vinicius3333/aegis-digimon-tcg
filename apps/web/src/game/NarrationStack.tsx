/* The narration slots: the one place on the board where "what just happened" is
   read out.

   A slot shows one item at a time, and an item is a side panel, an effect notice,
   or the two of them as one block when they are the same moment (narration.ts).
   Portrait phone: one centred slot under the opponent bar. Everywhere else: the
   viewer's corner on the left and the opponent's on the right.

   A refused action is not queued — it answers the viewer's own tap — so it never
   waits behind an item. It rides the viewer's own slot, under whatever that slot
   is presenting, so the two read top to bottom instead of over each other. */

import type { ReactNode } from "react";
import { NoticeStack } from "./NoticeStack";
import { SidePanelStack } from "./SidePanelStack";
import { narrationRemaining, type NarrationItem, type NarrationSlot } from "./narration";
import { noticeRemaining, type MatchNotice } from "./notices";

function NarrationItemView({
  item,
  nowMs,
  held,
  onAdvance,
}: {
  item: NarrationItem;
  nowMs: number;
  held: boolean;
  onAdvance: () => void;
}) {
  const remainingMs = narrationRemaining(item, nowMs);
  return (
    <>
      {item.panel ? (
        <SidePanelStack panel={item.panel} remainingMs={remainingMs} held={held} onDismiss={onAdvance} />
      ) : null}
      {item.notice ? (
        <NoticeStack notice={item.notice} remainingMs={remainingMs} held={held} onDismiss={onAdvance} />
      ) : null}
    </>
  );
}

function Slot({ slot, held, children }: { slot: NarrationSlot | "rejection"; held?: boolean; children: ReactNode }) {
  return (
    <div className="narration-slot" data-slot={slot} data-held={held || undefined}>
      {children}
    </div>
  );
}

export function NarrationStack({
  narration,
  rejection,
  nowMs,
  compact = false,
  held = false,
  onAdvance,
  onDismissRejection,
}: {
  /** The item each slot is currently presenting. */
  narration: ReadonlyMap<NarrationSlot, NarrationItem>;
  /** The viewer's own refused action, shown at once and outside the queue. */
  rejection: MatchNotice | null;
  /** Injected so the eroding borders start at the right point after a re-render. */
  nowMs?: number;
  /** The portrait phone folds both sides into one centred slot. */
  compact?: boolean;
  /** A decision is waiting, so every clock on screen is stopped. */
  held?: boolean;
  /** Moves the slot on to the next moment. */
  onAdvance: () => void;
  onDismissRejection: () => void;
}) {
  const now = nowMs ?? Date.now();
  // The refusal shares the viewer's slot, which on a phone is the only slot there is.
  const viewerSlot: NarrationSlot = compact ? "narration" : "narration-you";
  const item = (slot: NarrationSlot) => narration.get(slot);
  const viewerItem = item(viewerSlot);
  const oppItem = compact ? undefined : item("narration-opp");
  const body = (shown: NarrationItem) => (
    <NarrationItemView item={shown} nowMs={now} held={held} onAdvance={onAdvance} />
  );
  return (
    <>
      {oppItem ? (
        <Slot slot="narration-opp" held={held}>
          {body(oppItem)}
        </Slot>
      ) : null}
      {viewerItem || rejection ? (
        <Slot slot={viewerSlot} held={held}>
          {viewerItem ? body(viewerItem) : null}
          {rejection ? (
            <NoticeStack
              notice={rejection}
              remainingMs={noticeRemaining(rejection, now)}
              onDismiss={onDismissRejection}
            />
          ) : null}
        </Slot>
      ) : null}
    </>
  );
}
