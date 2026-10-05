import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { CardMini } from "../design/cards";
import { Icons } from "../design/icons";
import { Dialog } from "../design/primitives";
import { useTranslation, type Translate } from "../i18n";
import { cardDisplayName } from "./cardLinks";
import { deletionPanel, isCardListNotice, narrationRemaining, type NarrationItem } from "./narration";
import { narrationSummary } from "./narrationSummary";
import { NoticeStack } from "./NoticeStack";
import { noticeRemaining, type MatchNotice } from "./notices";
import { Side } from "./side";
import { SidePanelStack } from "./SidePanelStack";
import "./style/compactNarration.css";

/** The per-side caps the desktop lanes use: two clauses on the left, two card lists on the right. */
const LANE_LIMIT = 2;
/* A full 44px touch target where the board leaves room; never below the 24px minimum. */
const ROW_MIN_HEIGHT = 24;
const ROW_MAX_HEIGHT = 44;

/**
 * The recent moments a phone keeps, newest first. Eligibility follows the desktop lanes —
 * the two newest clauses (a refusal takes one of those places) and the two newest card
 * lists — but a moment is listed once, so a clause and the cards it moved stay together.
 */
function recentMoments(narration: ReadonlyMap<string, NarrationItem>, rejection: MatchNotice | null, nowMs: number) {
  const items = [...narration.values()];
  const clauses = items
    .filter((item) => item.notice && !isCardListNotice(item.notice))
    .slice(-(LANE_LIMIT - (rejection ? 1 : 0)));
  const cardLists = items
    .flatMap((item) => [...(item.panel ? [item] : []), ...(item.notice && isCardListNotice(item.notice) ? [item] : [])])
    .slice(-LANE_LIMIT);
  const retained = new Set([...clauses, ...cardLists]);
  const recent = items.filter((item) => retained.has(item)).reverse();
  if (!rejection) return recent;
  return [
    {
      id: rejection.id,
      batchId: "rejection",
      side: rejection.side,
      createdAt: rejection.createdAt,
      notice: rejection,
      lifetimeMs: noticeRemaining(rejection, nowMs) + Math.max(0, nowMs - rejection.createdAt),
    } satisfies NarrationItem,
    ...recent,
  ];
}

/** One line: what happened and, when the clause moved cards, what it moved. */
function rowSummary(item: NarrationItem, t: Translate) {
  const summary = narrationSummary(item, t);
  const cards = item.panel?.cards ?? (item.notice?.body.variant === "deletion" ? item.notice.body.cards : []);
  const cardsLabel = (count: number, cardId: string | undefined) =>
    count === 1 ? cardDisplayName(cardId, t) : t("notice.cardCount", { count });
  const clause = summary.clause?.replace(/^\[[^\]]+\]\s*/, "");
  const showsResult = Boolean(item.notice && item.panel && cards.length);
  return {
    ...summary,
    action: clause || (cards.length && !showsResult ? cardsLabel(cards.length, cards[0]?.cardId) : summary.name) || "",
    result: showsResult
      ? { cardId: cards[0]!.cardId, artId: cards[0]!.artId, label: cardsLabel(cards.length, cards[0]!.cardId) }
      : undefined,
    artId: summary.artId ?? cards[0]?.artId,
  };
}

function RowLife({ item, nowMs }: { item: NarrationItem; nowMs: number }) {
  const [remainingMs] = useState(() => narrationRemaining(item, nowMs));
  return (
    <span
      className="compact-row__life"
      aria-hidden="true"
      style={{ animationDuration: `${remainingMs}ms` } as CSSProperties}
    />
  );
}

/**
 * Float the row in the gap between the opponent's upper controls and the top of their
 * battle cards, measured from the live board. The row takes no layout space, so it has to
 * find room instead of making it: when the gap is shorter than a readable line, it keeps
 * the opponent's cards clear and overlaps the bottom edge of the controls above.
 */
function placeRow(slot: HTMLElement) {
  const board = slot.closest(".game-board");
  const anchor = slot.offsetParent;
  const opponentRow = board?.querySelector(".game-field .game-battle-row");
  if (!board || !anchor || !opponentRow) return;
  const visible = (node: Element) =>
    node.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true;
  const header = board.querySelector(".game-opponent-bar")?.getBoundingClientRect();
  const headerBottom = header && header.height > 0 ? header.bottom : board.getBoundingClientRect().top;
  const rowTop = opponentRow.getBoundingClientRect().top;
  const cardTops = [...opponentRow.querySelectorAll(".game-permanent, .game-source-badge")]
    .filter(visible)
    .map((node) => node.getBoundingClientRect())
    .filter((box) => box.height > 0)
    .map((box) => box.top);
  const cardTop = cardTops.length ? Math.min(...cardTops) : rowTop;
  const obstacles = [...board.querySelectorAll('button, [role="button"], .game-source-badge')]
    .filter((node) => !slot.contains(node) && !opponentRow.contains(node) && !node.closest(".aegis-dialog-layer"))
    .filter(visible)
    .map((node) => node.getBoundingClientRect())
    .filter((box) => box.height > 0 && box.width > 0 && box.top < cardTop && box.bottom > headerBottom);
  const ceiling = Math.max(headerBottom, ...obstacles.filter((box) => box.bottom <= cardTop).map((box) => box.bottom));
  const floor = Math.min(cardTop, ...obstacles.filter((box) => box.top > ceiling).map((box) => box.top));
  const gap = floor - ceiling;
  const height = Math.min(ROW_MAX_HEIGHT, Math.max(ROW_MIN_HEIGHT, gap));
  const top = gap >= height ? ceiling + (gap - height) / 2 : Math.max(headerBottom, floor - height);
  const origin = anchor.getBoundingClientRect().top;
  slot.style.top = `${Math.round(top - origin)}px`;
  slot.style.height = `${Math.round(height)}px`;
}

/** Retain the opened occurrences so their details stay readable even after the row moves on. */
export function CompactNarration({
  narration,
  rejection,
  nowMs,
  promptSourceCardId,
  securityDockActive,
  onAdvance,
  onDismissRejection,
}: {
  narration: ReadonlyMap<string, NarrationItem>;
  rejection: MatchNotice | null;
  nowMs: number;
  promptSourceCardId?: string;
  securityDockActive: boolean;
  onAdvance: (id: string) => void;
  onDismissRejection: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [details, setDetails] = useState<{ entries: NarrationItem[]; selectedId: string } | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const openedFrom = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!details && openedFrom.current && !openedFrom.current.isConnected) slotRef.current?.focus();
  }, [details]);
  const recent = recentMoments(narration, rejection, nowMs);
  const active = recent[0];

  const activeId = active?.id;
  useLayoutEffect(() => {
    if (slotRef.current) placeRow(slotRef.current);
  }, [activeId, recent.length]);
  useEffect(() => {
    const slot = slotRef.current;
    const board = slot?.closest(".game-board");
    if (!slot || !board) return;
    const place = () => placeRow(slot);
    const observer = new ResizeObserver(place);
    observer.observe(board);
    const field = board.querySelector(".game-field");
    if (field) observer.observe(field);
    board.addEventListener("scroll", place, { capture: true, passive: true });
    return () => {
      observer.disconnect();
      board.removeEventListener("scroll", place, { capture: true });
    };
  }, []);

  const open = (button: HTMLButtonElement, selectedId: string) => {
    openedFrom.current = button;
    setDetails({ entries: recent.map((item) => narration.get(item.id) ?? item), selectedId });
  };
  const close = () => setDetails(null);
  const dismiss = (item: NarrationItem) => {
    if (item.id === rejection?.id) onDismissRejection();
    else onAdvance(item.id);
    setDetails(null);
  };
  const isPromptEffect = (item: NarrationItem) =>
    item.notice?.body.variant === "effect" && item.notice.body.cardId === promptSourceCardId;
  const ownerLabel = (item: NarrationItem) => t(item.side === Side.Viewer ? "game.you" : "game.opponent");

  const summary = active ? rowSummary(active, t) : undefined;
  const selected = details?.entries.find((entry) => entry.id === details.selectedId) ?? details?.entries[0];
  const deletion = selected?.notice ? deletionPanel(selected.notice) : undefined;
  const selectedSummary = selected ? narrationSummary(selected, t) : undefined;
  return (
    <>
      <div
        ref={slotRef}
        className="narration-slot narration-slot--compact"
        data-slot="narration-row"
        data-security-dock={securityDockActive || undefined}
        tabIndex={-1}
      >
        {active && summary ? (
          <div
            className="compact-row"
            data-narration-id={active.id}
            data-tone={summary.tone}
            data-side={active.side}
            data-prompt-effect={isPromptEffect(active) || undefined}
            data-reading-paused={active.pausedAt !== undefined || undefined}
          >
            <button
              type="button"
              className="compact-row__open"
              onClick={(event) => open(event.currentTarget, active.id)}
              aria-label={`${t("notice.expand")}: ${ownerLabel(active)}, ${summary.label}${summary.name ? `, ${summary.name}` : ""}${summary.action ? `: ${summary.action}` : ""}${summary.result ? ` → ${summary.result.label}` : ""}`}
              aria-haspopup="dialog"
              aria-expanded={details?.selectedId === active.id}
            >
              <span className="compact-row__owner">{ownerLabel(active)}</span>
              {summary.cardId ? (
                <span className="compact-row__art" aria-hidden="true">
                  <CardMini cardId={summary.cardId} artId={summary.artId} width={14} zoomOnHover={false} />
                </span>
              ) : null}
              <span className="compact-row__label">{summary.label}</span>
              <span className="compact-row__action">{summary.action}</span>
              {summary.result ? (
                <span className="compact-row__result" aria-hidden="true">
                  <span className="compact-row__arrow">→</span>
                  <span className="compact-row__art">
                    <CardMini
                      cardId={summary.result.cardId}
                      artId={summary.result.artId}
                      width={14}
                      zoomOnHover={false}
                    />
                  </span>
                  <span className="compact-row__result-label">{summary.result.label}</span>
                </span>
              ) : null}
              <RowLife key={active.id} item={active} nowMs={nowMs} />
            </button>
            {recent.length > 1 ? (
              <button
                type="button"
                className="compact-row__more"
                onClick={(event) => open(event.currentTarget, recent[1]!.id)}
                aria-label={t("notice.more", { count: recent.length - 1 })}
                aria-haspopup="dialog"
              >
                +{recent.length - 1}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {details && selected ? (
        <Dialog labelledBy={titleId} className="notice-details" onClose={close}>
          <header className="notice-details__header">
            <h2 id={titleId}>{t("notice.details")}</h2>
            <button type="button" className="notice-details__close" onClick={close} aria-label={t("notice.close")}>
              <Icons.X size={20} />
            </button>
          </header>
          {details.entries.length > 1 ? (
            <div className="notice-details__entries" role="group" aria-label={t("notice.recent")}>
              {details.entries.map((entry) => {
                const entrySummary = rowSummary(entry, t);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className="notice-details__entry"
                    aria-pressed={entry.id === selected.id}
                    onClick={() => setDetails({ ...details, selectedId: entry.id })}
                  >
                    {ownerLabel(entry)} · {entrySummary.label}
                    {entrySummary.action ? ` · ${entrySummary.action}` : ""}
                  </button>
                );
              })}
            </div>
          ) : null}
          <p className="notice-details__source">
            <strong>{ownerLabel(selected)}</strong>
            {selectedSummary?.name ? (
              <>
                {" · "}
                <strong>{selectedSummary.name}</strong> {selectedSummary.cardId}
              </>
            ) : null}
          </p>
          <div className="notice-details__body" data-reading-paused="true">
            {selected.notice && !deletion ? (
              <NoticeStack notice={selected.notice} remainingMs={0} onDismiss={() => dismiss(selected)} />
            ) : null}
            {selected.panel ? (
              <SidePanelStack panel={selected.panel} remainingMs={0} onDismiss={() => dismiss(selected)} />
            ) : null}
            {deletion ? <SidePanelStack panel={deletion} remainingMs={0} onDismiss={() => dismiss(selected)} /> : null}
          </div>
          <button type="button" className="notice-details__dismiss" onClick={() => dismiss(selected)}>
            {t("notice.dismiss")}
          </button>
        </Dialog>
      ) : null}
    </>
  );
}
