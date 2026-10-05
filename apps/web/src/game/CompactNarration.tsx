import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { CardMini } from "../design/cards";
import { Icons } from "../design/icons";
import { Dialog } from "../design/primitives";
import { useTranslation } from "../i18n";
import {
  deletionPanel,
  isCardListNotice,
  narrationReadingTime,
  narrationRemaining,
  type NarrationItem,
} from "./narration";
import { narrationSummary } from "./narrationSummary";
import { NoticeStack } from "./NoticeStack";
import { noticeRemaining, type MatchNotice } from "./notices";
import { SidePanelStack } from "./SidePanelStack";
import "./style/compactNarration.css";

function CompactToast({
  item,
  nowMs,
  selected,
  prompt,
  onOpen,
}: {
  item: NarrationItem;
  nowMs: number;
  selected: boolean;
  prompt: boolean;
  onOpen: (button: HTMLButtonElement) => void;
}) {
  const { t } = useTranslation();
  const summary = narrationSummary(item, t);
  const [remainingMs] = useState(() => narrationRemaining(item, nowMs));
  const cards = item.panel?.cards ?? (item.notice?.body.variant === "deletion" ? item.notice.body.cards : []);
  return (
    <div
      className="narration-item compact-toast"
      data-narration-id={item.id}
      data-tone={summary.tone}
      data-side={item.side}
      data-prompt-effect={prompt || undefined}
      data-reading-paused={item.pausedAt !== undefined || undefined}
    >
      <button
        type="button"
        className="compact-toast__open"
        onClick={(event) => onOpen(event.currentTarget)}
        aria-label={`${t("notice.expand")}: ${t(item.side === "you" ? "panel.yours" : "panel.opponents")}, ${summary.label}${summary.name ? `, ${summary.name}` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={selected}
      >
        <span className="compact-toast__copy">
          <span className="compact-toast__heading">
            {summary.cardId ? (
              <span className="compact-toast__art" aria-hidden="true">
                <CardMini
                  cardId={summary.cardId}
                  artId={summary.artId ?? cards[0]?.artId}
                  width={16}
                  zoomOnHover={false}
                />
              </span>
            ) : null}
            <span className="compact-toast__label">{summary.label}</span>
          </span>
          <span className="compact-toast__clause">
            {summary.clause?.replace(/^\[[^\]]+\]\s*/, "") ||
              (cards.length ? t("notice.cardCount", { count: cards.length }) : summary.name || summary.label)}
          </span>
        </span>
      </button>
      <span
        className="compact-toast__life"
        aria-hidden="true"
        style={{ animationDuration: `${remainingMs}ms` } as CSSProperties}
      />
    </div>
  );
}

/** Retain the selected occurrence so its details stay readable even after its toast expires. */
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
  const [selected, setSelected] = useState<NarrationItem | null>(null);
  const openedFrom = useRef<HTMLButtonElement | null>(null);
  const openedLane = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!selected && openedFrom.current && !openedFrom.current.isConnected) openedLane.current?.focus();
  }, [selected]);
  const items = [...narration.values()];
  const left = items
    .filter((item) => item.notice && !isCardListNotice(item.notice))
    .map((item) => ({ ...item, panel: undefined, lifetimeMs: narrationReadingTime(item) }))
    .slice(-(2 - (rejection ? 1 : 0)));
  if (rejection)
    left.push({
      id: rejection.id,
      batchId: "rejection",
      side: rejection.side,
      createdAt: rejection.createdAt,
      notice: rejection,
      panel: undefined,
      lifetimeMs: noticeRemaining(rejection, nowMs) + Math.max(0, nowMs - rejection.createdAt),
    });
  const right = items
    .flatMap((item) => [
      ...(item.panel ? [{ ...item, notice: undefined, lifetimeMs: narrationReadingTime(item) }] : []),
      ...(item.notice && isCardListNotice(item.notice)
        ? [{ ...item, panel: undefined, lifetimeMs: narrationReadingTime(item) }]
        : []),
    ])
    .slice(-2);
  const dismiss = (item: NarrationItem) => {
    if (item.id === rejection?.id) onDismissRejection();
    else onAdvance(item.id);
    if (selected?.id === item.id) setSelected(null);
  };
  const isPromptEffect = (item: NarrationItem) => {
    const body = narration.get(item.id)?.notice?.body;
    return body?.variant === "effect" && body.cardId === promptSourceCardId;
  };
  const column = (entries: readonly NarrationItem[], slot: "narration-text" | "narration-cards") => (
    <div
      className="narration-slot narration-slot--compact"
      data-slot={slot}
      data-security-dock={securityDockActive || undefined}
      tabIndex={-1}
    >
      {entries.map((item) => (
        <CompactToast
          key={`${item.id}:${item.panel ? "panel" : "notice"}`}
          item={item}
          nowMs={nowMs}
          selected={selected?.id === item.id}
          prompt={isPromptEffect(item)}
          onOpen={(button) => {
            openedFrom.current = button;
            openedLane.current = button.closest(".narration-slot");
            setSelected(narration.get(item.id) ?? item);
          }}
        />
      ))}
    </div>
  );
  const deletion = selected?.notice ? deletionPanel(selected.notice) : undefined;
  const selectedSummary = selected ? narrationSummary(selected, t) : undefined;
  return (
    <>
      {column(left, "narration-text")}
      {column(right, "narration-cards")}
      {selected ? (
        <Dialog labelledBy={titleId} className="notice-details" onClose={() => setSelected(null)}>
          <header className="notice-details__header">
            <h2 id={titleId}>{t("notice.details")}</h2>
            <button
              type="button"
              className="notice-details__close"
              onClick={() => setSelected(null)}
              aria-label={t("notice.close")}
            >
              <Icons.X size={20} />
            </button>
          </header>
          {selectedSummary?.name ? (
            <p className="notice-details__source">
              <strong>{selectedSummary.name}</strong> {selectedSummary.cardId}
            </p>
          ) : null}
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
