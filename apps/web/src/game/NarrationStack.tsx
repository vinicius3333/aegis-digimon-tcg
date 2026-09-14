/* Recent effects and card movements share bounded columns. Each item owns its
   reading lifetime and dismissal; both players share one column on portrait phones. */

import { useState, type CSSProperties, type ReactNode } from "react";
import { NoticeStack } from "./NoticeStack";
import { SidePanelStack } from "./SidePanelStack";
import { narrationRemaining, type NarrationItem, type NarrationSlot } from "./narration";
import { noticeRemaining, type MatchNotice } from "./notices";

function NarrationItemView({ item, nowMs, onAdvance }: { item: NarrationItem; nowMs: number; onAdvance: () => void }) {
  // Keep the running CSS duration stable when neighboring records change.
  const [mountedAt] = useState(nowMs);
  const remainingMs = narrationRemaining(item, mountedAt);
  return (
    <>
      {item.panel ? <SidePanelStack panel={item.panel} remainingMs={remainingMs} onDismiss={onAdvance} /> : null}
      {item.notice ? <NoticeStack notice={item.notice} remainingMs={remainingMs} onDismiss={onAdvance} /> : null}
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
  // The refusal shares the viewer's slot, which on a phone is the only slot there is.
  const viewerSlot: NarrationSlot = compact ? "narration" : "narration-you";
  const items = [...narration.values()];
  const viewerItems = compact ? items : items.filter((item) => item.side === "you");
  const oppItems = compact ? [] : items.filter((item) => item.side === "opp");
  const body = (shown: NarrationItem) => (
    <div className="narration-item" key={shown.id} data-narration-id={shown.id}>
      <NarrationItemView item={shown} nowMs={now} onAdvance={() => onAdvance(shown.id)} />
    </div>
  );
  return (
    <>
      {oppItems.length > 0 ? (
        <Slot slot="narration-opp" count={oppItems.length} securityDockActive={securityDockActive}>
          {oppItems.map(body)}
        </Slot>
      ) : null}
      {viewerItems.length > 0 || rejection ? (
        <Slot
          slot={viewerSlot}
          count={viewerItems.length + (rejection ? 1 : 0)}
          securityDockActive={securityDockActive}
        >
          {viewerItems.map(body)}
          {rejection ? (
            <RejectionView key={rejection.id} notice={rejection} nowMs={now} onDismiss={onDismissRejection} />
          ) : null}
        </Slot>
      ) : null}
    </>
  );
}
