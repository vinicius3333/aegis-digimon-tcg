/* Recent effects and card movements share two bounded columns, split by what a moment is
   rather than by whose moment it is: the clause to read on the left, the cards the moment
   moved on the right. Both players' moments use both columns, so the eye always looks in
   the same place for the same kind of thing. Each item owns its reading lifetime and
   dismissal; a portrait phone folds the two columns into one. */

import { useState, type CSSProperties, type ReactNode } from "react";
import { NoticeStack } from "./NoticeStack";
import { SidePanelStack } from "./SidePanelStack";
import { isCardListNotice, narrationRemaining, type NarrationItem, type NarrationSlot } from "./narration";
import { noticeRemaining, type MatchNotice } from "./notices";

/**
 * One half of a moment, in the column that half belongs to. A moment carrying both a
 * clause and a list of cards is drawn twice — once per column — and either half dismisses
 * the whole moment, because they are one thing that happened.
 */
function NarrationItemView({
  item,
  half,
  nowMs,
  onAdvance,
}: {
  item: NarrationItem;
  half: "text" | "cards";
  nowMs: number;
  onAdvance: () => void;
}) {
  // Keep the running CSS duration stable when neighboring records change.
  const [mountedAt] = useState(nowMs);
  const remainingMs = narrationRemaining(item, mountedAt);
  const notice = item.notice && (half === "cards") === isCardListNotice(item.notice) ? item.notice : undefined;
  return (
    <>
      {half === "cards" && item.panel ? (
        <SidePanelStack panel={item.panel} remainingMs={remainingMs} onDismiss={onAdvance} />
      ) : null}
      {notice ? <NoticeStack notice={notice} remainingMs={remainingMs} onDismiss={onAdvance} /> : null}
    </>
  );
}

function Slot({
  slot,
  count,
  children,
  securityDockActive,
}: {
  slot: NarrationSlot | "rejection";
  count: number;
  children: ReactNode;
  securityDockActive?: boolean;
}) {
  return (
    <div
      className="narration-slot"
      data-slot={slot}
      data-security-dock={securityDockActive || undefined}
      style={{ "--narration-count": count } as CSSProperties}
    >
      {children}
    </div>
  );
}

function RejectionView({ notice, nowMs, onDismiss }: { notice: MatchNotice; nowMs: number; onDismiss: () => void }) {
  const [mountedAt] = useState(nowMs);
  return <NoticeStack notice={notice} remainingMs={noticeRemaining(notice, mountedAt)} onDismiss={onDismiss} />;
}

export function NarrationStack({
  narration,
  rejection,
  nowMs,
  compact = false,
  securityDockActive = false,
  onAdvance,
  onDismissRejection,
}: {
  /** Recent items keyed by occurrence ID. */
  narration: ReadonlyMap<string, NarrationItem>;
  /** The viewer's own refused action, shown at once and outside the queue. */
  rejection: MatchNotice | null;
  /** Injected so the eroding borders start at the right point after a re-render. */
  nowMs?: number;
  /** The portrait phone folds both sides into one centred slot. */
  compact?: boolean;
  securityDockActive?: boolean;
  /** Dismiss only the named record. */
  onAdvance: (id: string) => void;
  onDismissRejection: () => void;
}) {
  const now = nowMs ?? Date.now();
  // A refusal is a sentence about the viewer's own tap, so it reads with the clauses —
  // which on a phone is the only column there is.
  const textSlot: NarrationSlot = compact ? "narration" : "narration-text";
  const items = [...narration.values()];
  const hasCards = (item: NarrationItem) => Boolean(item.panel || (item.notice && isCardListNotice(item.notice)));
  const hasText = (item: NarrationItem) => Boolean(item.notice && !isCardListNotice(item.notice));
  const textItems = compact ? items : items.filter(hasText);
  const cardItems = compact ? [] : items.filter(hasCards);
  const body = (half: "text" | "cards") => (shown: NarrationItem) => (
    <div className="narration-item" key={shown.id} data-narration-id={shown.id}>
      <NarrationItemView item={shown} half={half} nowMs={now} onAdvance={() => onAdvance(shown.id)} />
    </div>
  );
  // The folded column draws both halves of a moment, one after the other.
  const compactBody = (shown: NarrationItem) => (
    <div className="narration-item" key={shown.id} data-narration-id={shown.id}>
      <NarrationItemView item={shown} half="cards" nowMs={now} onAdvance={() => onAdvance(shown.id)} />
      <NarrationItemView item={shown} half="text" nowMs={now} onAdvance={() => onAdvance(shown.id)} />
    </div>
  );
  return (
    <>
      {cardItems.length > 0 ? (
        <Slot slot="narration-cards" count={cardItems.length} securityDockActive={securityDockActive}>
          {cardItems.map(body("cards"))}
        </Slot>
      ) : null}
      {textItems.length > 0 || rejection ? (
        <Slot slot={textSlot} count={textItems.length + (rejection ? 1 : 0)} securityDockActive={securityDockActive}>
          {textItems.map(compact ? compactBody : body("text"))}
          {rejection ? (
            <RejectionView key={rejection.id} notice={rejection} nowMs={now} onDismiss={onDismissRejection} />
          ) : null}
        </Slot>
      ) : null}
    </>
  );
}
