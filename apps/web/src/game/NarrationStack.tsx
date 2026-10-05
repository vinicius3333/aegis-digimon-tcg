/* Recent effects and card movements share two bounded columns, split by what a moment is
   rather than by whose moment it is: the clause to read on the left, the cards the moment
   moved on the right. Both players' moments use both columns, so the eye always looks in
   the same place for the same kind of thing. Each item owns its reading lifetime and
   dismissal; a phone keeps compact versions of both columns. */

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "../i18n";
import { Icons } from "../design/icons";
import { CompactNarration } from "./CompactNarration";
import { NoticeStack } from "./NoticeStack";
import { SidePanelStack } from "./SidePanelStack";
import {
  deletionPanel,
  isCardListNotice,
  narrationReadingTime,
  type NarrationItem,
  type NarrationSlot,
} from "./narration";
import { noticeRemaining, type MatchNotice } from "./notices";

const MAX_VISIBLE_TOASTS = 2;

/**
 * How much a column may have left to scroll before it counts as scrolled to the end. Below
 * this the remainder is the gap under the last moment and sub-pixel rounding, not a moment
 * the viewer has not seen, and a chevron over it points at nothing.
 */
const MORE_CHEVRON_SLACK_PX = 24;

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
  const [readingElapsedMs] = useState(() => Math.max(0, Math.min(nowMs, item.pausedAt ?? nowMs) - item.createdAt));
  const remainingMs = Math.max(0, narrationReadingTime(item) - readingElapsedMs);
  const notice = item.notice && (half === "cards") === isCardListNotice(item.notice) ? item.notice : undefined;
  // A deletion is a titled list of cards, so it is one (`deletionPanel`) rather than a
  // second component drawing the same thing in a frame of its own.
  const deletion = notice ? deletionPanel(notice) : undefined;
  return (
    <>
      {half === "cards" && item.panel ? (
        <SidePanelStack panel={item.panel} remainingMs={remainingMs} onDismiss={onAdvance} />
      ) : null}
      {deletion ? <SidePanelStack panel={deletion} remainingMs={remainingMs} onDismiss={onAdvance} /> : null}
      {notice && !deletion ? <NoticeStack notice={notice} remainingMs={remainingMs} onDismiss={onAdvance} /> : null}
    </>
  );
}

/**
 * A slot capped in height scrolls rather than dropping what it cannot show: the newest
 * moment stays in view until the viewer scrolls up to read. Buttons at either edge point
 * to the notices outside the viewport and move through them one page at a time.
 */
function Slot({
  slot,
  count,
  children,
  securityDockActive,
  onTogglePeek,
  peekLabel,
  closeLabel,
  anchor = "bottom",
}: {
  slot: NarrationSlot | "rejection";
  count: number;
  children: ReactNode;
  securityDockActive?: boolean;
  /** Collapses the opened column back to the accordion (the phone's slot). */
  onTogglePeek?: () => void;
  /** The control's accessible name, which says what tapping it does. */
  peekLabel?: string;
  /** The word printed on the control, short enough to ride the column's top edge. */
  closeLabel?: string;
  /**
   * Which end of the column holds still as it fills.
   *
   * A running column follows the newest moment at the bottom, the way a feed does. The
   * accordion's opened column anchors at the top instead: it is opened to be read from the
   * beginning, and a column that jumped to the end would drop the viewer into the middle of
   * a batch they had not seen yet.
   */
  anchor?: "top" | "bottom";
}) {
  const column = useRef<HTMLDivElement>(null);
  const followsNewest = useRef(true);
  const leavingBottom = useRef(false);
  const [more, setMore] = useState({ above: false, below: false });
  // Before paint, so a moment arriving never shows the column scrolled to the old one.
  useLayoutEffect(() => {
    const element = column.current;
    if (!element) return;
    if (anchor === "bottom" && followsNewest.current) element.scrollTop = element.scrollHeight;
  }, [count, anchor, children]);
  useEffect(() => {
    const element = column.current;
    if (!element) return;
    const update = () => {
      const above = element.scrollTop > MORE_CHEVRON_SLACK_PX;
      const below = element.scrollTop + element.clientHeight < element.scrollHeight - MORE_CHEVRON_SLACK_PX;
      setMore((current) => (current.above === above && current.below === below ? current : { above, below }));
    };
    const onScroll = () => {
      const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - MORE_CHEVRON_SLACK_PX;
      if (!atBottom) leavingBottom.current = false;
      followsNewest.current = atBottom && !leavingBottom.current;
      update();
    };
    update();
    element.addEventListener("scroll", onScroll, { passive: true });
    /* The column also grows and shrinks without scrolling and without a new moment: a
       card's art arrives late, a clause rewraps. Watching the box and its moments keeps
       the chevron honest about what is actually out of sight. */
    // Feature-detected rather than assumed: the test renderer has no ResizeObserver, and
    // without one the scroll listener above still keeps the chevron right.
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
    observer?.observe(element);
    for (const child of element.children) observer?.observe(child);
    return () => {
      element.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, [count, anchor, children]);
  const { t } = useTranslation();

  function scrollPage(direction: -1 | 1) {
    const element = column.current;
    if (!element) return;
    followsNewest.current = false;
    leavingBottom.current = direction === -1;
    element.scrollBy({
      top: direction * Math.max(48, element.clientHeight * 0.8),
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }
  return (
    <div
      className="narration-slot"
      data-slot={slot}
      data-security-dock={securityDockActive || undefined}
      data-more={more.above || more.below || undefined}
      data-anchor={anchor}
      ref={column}
      style={{ "--narration-count": count } as CSSProperties}
    >
      {onTogglePeek ? (
        /* The only way back to the band, on a screen with no Escape key: a labelled pill
           rather than a bare icon, sized for a thumb and named in words, because an
           unlabelled 30px chevron over a busy board is not a control anyone finds.
           It leads the column so that sticking to the top edge pins it from the first
           paint: sitting after the moments, it stayed at the far end of a column taller
           than the screen and was only reachable by scrolling to the bottom of it. */
        <button
          className="narration-slot__peek"
          type="button"
          onClick={onTogglePeek}
          aria-expanded={true}
          aria-label={peekLabel}
        >
          <Icons.ChevronUp size={18} />
          <span className="narration-slot__peek-label">{closeLabel}</span>
        </button>
      ) : null}
      {more.above ? (
        <button
          className="narration-slot__more"
          type="button"
          onClick={() => scrollPage(-1)}
          aria-label={t("notice.moreAbove")}
        >
          <Icons.ChevronUp size={20} />
          <span>{t("notice.above")}</span>
        </button>
      ) : null}
      {children}
      {more.below ? (
        <button
          className="narration-slot__more"
          data-below="true"
          type="button"
          onClick={() => scrollPage(1)}
          aria-label={t("notice.moreBelow")}
        >
          <Icons.ChevronDown size={20} />
          <span>{t("notice.below")}</span>
        </button>
      ) : null}
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
  promptSourceCardId,
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
  /** Small screens keep both columns as compact, individually expandable toasts. */
  compact?: boolean;
  /**
   * The card whose effect the viewer's open decision is about. Marks its notices while
   * keeping all previously accepted effects in the stack.
   */
  promptSourceCardId?: string | undefined;
  securityDockActive?: boolean;
  /** Dismiss only the named record. */
  onAdvance: (id: string) => void;
  onDismissRejection: () => void;
}) {
  const { t } = useTranslation();
  const now = nowMs ?? Date.now();
  // A refusal is a sentence about the viewer's own tap, so it reads with the clauses —
  // which on a phone is the only column there is.
  const textSlot: NarrationSlot = "narration-text";
  const items = [...narration.values()];
  const hasText = (item: NarrationItem) => Boolean(item.notice && !isCardListNotice(item.notice));
  const textItems = items.filter(hasText);
  // A record may carry two card toasts. Count the rendered panels, not records,
  // while keeping the original occurrence and lifetime for either dismissal.
  const cardItems = items
    .flatMap((item) => [
      ...(item.panel ? [{ ...item, notice: undefined }] : []),
      ...(item.notice && isCardListNotice(item.notice) ? [{ ...item, panel: undefined }] : []),
    ])
    .slice(-MAX_VISIBLE_TOASTS);
  const shownTextItems = textItems.slice(-(MAX_VISIBLE_TOASTS - (rejection ? 1 : 0)));
  const isPromptEffect = (item: NarrationItem) => {
    const body = (narration.get(item.id) ?? item).notice?.body;
    return body?.variant === "effect" && body.cardId === promptSourceCardId;
  };
  const body = (half: "text" | "cards") => (shown: NarrationItem) => (
    <div
      className="narration-item"
      key={half === "cards" ? `${shown.id}:${shown.panel ? "panel" : "notice"}` : shown.id}
      data-narration-id={shown.id}
      data-reading-paused={shown.pausedAt !== undefined || undefined}
      data-superseded={shown.superseded || undefined}
      data-prompt-effect={isPromptEffect(shown) || undefined}
    >
      <NarrationItemView item={shown} half={half} nowMs={now} onAdvance={() => onAdvance(shown.id)} />
    </div>
  );
  if (compact)
    return (
      <CompactNarration
        narration={narration}
        rejection={rejection}
        nowMs={now}
        promptSourceCardId={promptSourceCardId}
        securityDockActive={securityDockActive}
        onAdvance={onAdvance}
        onDismissRejection={onDismissRejection}
      />
    );
  return (
    <>
      {cardItems.length > 0 ? (
        <Slot slot="narration-cards" count={cardItems.length} securityDockActive={securityDockActive}>
          {cardItems.map(body("cards"))}
        </Slot>
      ) : null}
      {textItems.length > 0 || rejection ? (
        <Slot
          slot={textSlot}
          count={shownTextItems.length + (rejection ? 1 : 0)}
          securityDockActive={securityDockActive}
          peekLabel={t("notice.collapse")}
          closeLabel={t("notice.close")}
        >
          {shownTextItems.map(body("text"))}
          {rejection ? (
            <RejectionView key={rejection.id} notice={rejection} nowMs={now} onDismiss={onDismissRejection} />
          ) : null}
        </Slot>
      ) : null}
    </>
  );
}
