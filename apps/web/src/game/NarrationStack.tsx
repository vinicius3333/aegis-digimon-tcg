/* Recent effects and card movements share two bounded columns, split by what a moment is
   rather than by whose moment it is: the clause to read on the left, the cards the moment
   moved on the right. Both players' moments use both columns, so the eye always looks in
   the same place for the same kind of thing. Each item owns its reading lifetime and
   dismissal; a portrait phone folds the two columns into one. */

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CardMini } from "../design/cards";
import { Icons } from "../design/icons";
import { useTranslation, type Translate } from "../i18n";
import { cardDisplayName } from "./cardLinks";
import { TIMING_LABELS, playerFacingEffectClause } from "./overlay";
import { NoticeStack } from "./NoticeStack";
import { useSwipeToDismiss } from "./useSwipeToDismiss";
import { SidePanelStack } from "./SidePanelStack";
import {
  deletionPanel,
  isCardListNotice,
  narrationRemaining,
  type NarrationItem,
  type NarrationSlot,
} from "./narration";
import { noticeRemaining, type MatchNotice } from "./notices";

/** The art on the folded band: enough to recognise the card, not enough to read it. */
const PEEK_ART_WIDTH = 34;

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
  const [mountedAt] = useState(nowMs);
  const remainingMs = narrationRemaining(item, mountedAt);
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
 * moment is kept in view at the bottom, and older ones stay one scroll up. A chevron from
 * the shared icon set rides the top edge while there is something above it.
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
  const [more, setMore] = useState(false);
  // Before paint, so a moment arriving never shows the column scrolled to the old one.
  useLayoutEffect(() => {
    const element = column.current;
    if (!element) return;
    element.scrollTop = anchor === "top" ? 0 : element.scrollHeight;
  }, [count, anchor]);
  useEffect(() => {
    const element = column.current;
    if (!element) return;
    // The chevron points at what is out of sight, which is the end the column is not
    // anchored to: below a top-anchored column, above a bottom-anchored one. A remainder
    // smaller than a line of text is not content, it is rounding and the gap under the
    // last moment, so it does not earn a chevron promising something below.
    const update = () =>
      setMore(
        anchor === "top"
          ? element.scrollTop + element.clientHeight < element.scrollHeight - MORE_CHEVRON_SLACK_PX
          : element.scrollTop > MORE_CHEVRON_SLACK_PX,
      );
    update();
    element.addEventListener("scroll", update, { passive: true });
    /* The column also grows and shrinks without scrolling and without a new moment: a
       card's art arrives late, a clause rewraps. Watching the box and its moments keeps
       the chevron honest about what is actually out of sight. */
    // Feature-detected rather than assumed: the test renderer has no ResizeObserver, and
    // without one the scroll listener above still keeps the chevron right.
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
    observer?.observe(element);
    for (const child of element.children) observer?.observe(child);
    return () => {
      element.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [count, anchor]);
  return (
    <div
      className="narration-slot"
      data-slot={slot}
      data-security-dock={securityDockActive || undefined}
      data-more={more || undefined}
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
      {more && anchor === "bottom" ? (
        <span className="narration-slot__more" aria-hidden="true">
          <Icons.ChevronUp size={26} />
        </span>
      ) : null}
      {children}
      {more && anchor === "top" ? (
        <span className="narration-slot__more" data-below="true" aria-hidden="true">
          <Icons.ChevronDown size={26} />
        </span>
      ) : null}
    </div>
  );
}

/**
 * What the folded band says about one moment: the label its notice leads with, and the
 * card it is about. Built here rather than read off the drawn notice, because the folded
 * line is a summary of a moment, not a shrunken copy of the panel that presents it.
 */
/**
 * The accent the band is drawn in, which is what it says before it is read. The variants
 * fold into four because the band is a glance, not a legend: what an effect did, a card
 * leaving the board, a named mechanic, and something gained.
 */
type PeekTone = "effect" | "deletion" | "keyword" | "gain" | "rejection";

function peekSummary(
  item: NarrationItem,
  t: Translate,
): { label: string; name: string; tone: PeekTone; cardId?: string; clause?: string } {
  const body = item.notice?.body;
  if (body?.variant === "effect") {
    const clause = playerFacingEffectClause({
      cardId: body.cardId,
      timing: body.timing,
      description: body.description,
      ...(body.isInherited ? { isInherited: body.isInherited } : {}),
    });
    return {
      label: (body.timing ? TIMING_LABELS[body.timing] : undefined) ?? t("overlay.effect"),
      name: cardDisplayName(body.cardId, t),
      tone: "effect",
      cardId: body.cardId,
      ...(clause ? { clause } : {}),
    };
  }
  if (body?.variant === "keyword")
    return {
      label: t(`notice.keyword.${body.keyword}` as const),
      name: body.keyword === "guard" ? "" : cardDisplayName(body.cardId, t),
      tone: "keyword",
      cardId: body.cardId,
    };
  if (body?.variant === "deletion")
    return {
      label: t("notice.deletion"),
      name: cardDisplayName(body.cards[0]?.cardId, t),
      tone: "deletion",
      ...(body.cards[0]?.cardId ? { cardId: body.cards[0].cardId } : {}),
    };
  if (body?.variant === "recovery" || body?.variant === "securityGain")
    return {
      label: t(body.variant === "recovery" ? "overlay.recovery" : "overlay.securityGain", { count: body.amount }),
      name: "",
      tone: "gain",
    };
  if (body?.variant === "rejection") return { label: t("notice.rejected"), name: body.reason, tone: "rejection" };
  const panel = item.panel;
  if (panel)
    return {
      label: t(panel.titleKey as "panel.revealedCards"),
      name: cardDisplayName(panel.cards[0]?.cardId, t),
      tone: "effect",
      ...(panel.cards[0]?.cardId ? { cardId: panel.cards[0].cardId } : {}),
    };
  return { label: t("overlay.effect"), name: "", tone: "effect" };
}

/**
 * The phone's folded band: one row saying what the newest moment is, how many more are
 * still running, and nothing else. It is the whole control — tapping anywhere on it opens
 * the column — so no close button or eroding ring competes for the 44px it stands in.
 */
/**
 * How many toasts a set of moments draws, which is not how many moments it holds: one
 * moment carrying both halves — the clause on the left, the cards it moved on the right —
 * is two toasts on the board. The band counts what the viewer would see, so a moment with
 * both halves is not reported as one.
 */
function toastCount(items: readonly NarrationItem[]): number {
  return items.reduce((total, item) => total + (item.notice ? 1 : 0) + (item.panel ? 1 : 0), 0);
}

function PeekLine({
  items,
  label,
  nowMs,
  onOpen,
  onDismiss,
}: {
  items: readonly NarrationItem[];
  label: string;
  nowMs: number;
  onOpen: () => void;
  /** Swiping the band sideways clears every moment it stands for, like a phone notification. */
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  // Frozen at arrival so the running bar keeps its duration when a neighbour expires.
  const [mountedAt] = useState(nowMs);
  const swipe = useSwipeToDismiss(onDismiss);
  const newest = items.at(-1);
  if (!newest) return null;
  const summary = peekSummary(newest, t);
  // The band already names one of them, so the badge counts the rest.
  const queued = toastCount(items) - 1;
  return (
    <button
      className="narration-peek"
      type="button"
      data-tone={summary.tone}
      data-swipe={swipe.phase}
      style={{ "--swipe-offset": `${swipe.offset}px`, "--swipe-fade": swipe.fade } as CSSProperties}
      {...swipe.handlers}
      onClick={onOpen}
      aria-label={label}
      aria-expanded={false}
    >
      {summary.cardId ? (
        <span className="narration-peek__art" aria-hidden="true">
          <CardMini cardId={summary.cardId} width={PEEK_ART_WIDTH} zoomOnHover={false} />
        </span>
      ) : null}
      <span className="narration-peek__copy">
        <span className="narration-peek__head">
          <span className="narration-peek__label">{summary.label}</span>
          {summary.name ? <span className="narration-peek__name">{summary.name}</span> : null}
        </span>
        {/* One line of the clause: enough to know whether this is worth opening. */}
        {summary.clause ? <span className="narration-peek__clause">{summary.clause}</span> : null}
      </span>
      {/* Keyed on the count so the badge replays its pop when a moment queues behind this
          one without replacing it: the band would otherwise change a digit in silence. */}
      {queued > 0 ? (
        <span className="narration-peek__more" key={queued}>
          +{queued}
        </span>
      ) : null}
      <span className="narration-peek__chevron" aria-hidden="true">
        <Icons.ChevronDown size={18} />
      </span>
      {/* The folded band is the only thing a moment gets on this layout, so it carries the
          same running clock the opened notices draw — a band with nothing running on it
          reads as a fixture of the board rather than as something that just happened. */}
      <span
        className="narration-peek__life"
        style={{ animationDuration: `${narrationRemaining(newest, mountedAt)}ms` }}
        aria-hidden="true"
      />
    </button>
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
  const { t } = useTranslation();
  const now = nowMs ?? Date.now();
  // A refusal is a sentence about the viewer's own tap, so it reads with the clauses —
  // which on a phone is the only column there is.
  const textSlot: NarrationSlot = compact ? "narration" : "narration-text";
  const items = [...narration.values()];
  const hasCards = (item: NarrationItem) => Boolean(item.panel || (item.notice && isCardListNotice(item.notice)));
  const hasText = (item: NarrationItem) => Boolean(item.notice && !isCardListNotice(item.notice));
  const textItems = compact ? items : items.filter(hasText);
  /* The phone's slot lies over the opponent's field, so the whole column collapses to the
     accordion: one line naming the newest moment and counting the rest, with the board
     readable behind it. One tap opens everything, another closes it, and a column that
     empties closes itself again. */
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (textItems.length === 0) setExpanded(false);
  }, [textItems.length]);
  const cardItems = compact ? [] : items.filter(hasCards);
  const body = (half: "text" | "cards") => (shown: NarrationItem) => (
    <div className="narration-item" key={shown.id} data-narration-id={shown.id}>
      <NarrationItemView item={shown} half={half} nowMs={now} onAdvance={() => onAdvance(shown.id)} />
    </div>
  );
  /**
   * The folded column draws both halves of a moment, one after the other — in the order the
   * two columns read on a wide screen, left then right: the clause that did something, then
   * the cards it moved. Folded the other way round an [On Play] that reveals three cards
   * showed the three cards first and named the clause underneath, so the result arrived
   * before the cause and the reader had to work backwards.
   */
  const compactBody = (shown: NarrationItem) => (
    <div className="narration-item" key={shown.id} data-narration-id={shown.id}>
      <NarrationItemView item={shown} half="text" nowMs={now} onAdvance={() => onAdvance(shown.id)} />
      <NarrationItemView item={shown} half="cards" nowMs={now} onAdvance={() => onAdvance(shown.id)} />
    </div>
  );
  return (
    <>
      {cardItems.length > 0 ? (
        <Slot slot="narration-cards" count={cardItems.length} securityDockActive={securityDockActive}>
          {cardItems.map(body("cards"))}
        </Slot>
      ) : null}
      {/* A refusal answers the viewer's own tap, so it never folds: while one is on screen
          the phone's column opens whatever the band was doing. */}
      {compact && !expanded && !rejection && textItems.length > 0 ? (
        <Slot slot="narration" count={1} securityDockActive={securityDockActive}>
          {/* Keyed on the moment it names: the band is one row reused for every moment, and
              without a remount a new moment would slide into it with no entrance to see. */}
          <PeekLine
            key={textItems.at(-1)?.id}
            items={textItems}
            label={t("notice.expand")}
            nowMs={now}
            onOpen={() => setExpanded(true)}
            onDismiss={() => textItems.forEach((item) => onAdvance(item.id))}
          />
        </Slot>
      ) : textItems.length > 0 || rejection ? (
        <Slot
          slot={textSlot}
          count={textItems.length + (rejection ? 1 : 0)}
          securityDockActive={securityDockActive}
          {...(compact ? { onTogglePeek: () => setExpanded(false), anchor: "top" as const } : {})}
          peekLabel={t("notice.collapse")}
          closeLabel={t("notice.close")}
        >
          {textItems.map(compact ? compactBody : body("text"))}
          {rejection ? (
            <RejectionView key={rejection.id} notice={rejection} nowMs={now} onDismiss={onDismissRejection} />
          ) : null}
        </Slot>
      ) : null}
    </>
  );
}
