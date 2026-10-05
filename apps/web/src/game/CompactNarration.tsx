import { useId, useState, type CSSProperties } from "react";
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
  onDismiss,
}: {
  item: NarrationItem;
  nowMs: number;
  selected: boolean;
  prompt: boolean;
  onOpen: () => void;
  onDismiss: () => void;
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
      data-prompt-effect={prompt || undefined}
      data-reading-paused={item.pausedAt !== undefined || undefined}
    >
      <button
        type="button"
        className="compact-toast__open"
        onClick={onOpen}
        aria-label={`${t("notice.expand")}: ${summary.name || summary.label}`}
        aria-haspopup="dialog"
        aria-expanded={selected}
      >
        {summary.cardId ? (
          <span className="compact-toast__art" aria-hidden="true">
            <CardMini cardId={summary.cardId} artId={summary.artId ?? cards[0]?.artId} width={24} zoomOnHover={false} />
          </span>
        ) : null}
        <span className="compact-toast__copy">
          <span className="compact-toast__label">{summary.label}</span>
          {summary.name ? <strong className="compact-toast__name">{summary.name}</strong> : null}
          <span className="compact-toast__clause">
            {summary.clause || (cards.length ? t("notice.cardCount", { count: cards.length }) : t("notice.details"))}
          </span>
        </span>
      </button>
      <button type="button" className="compact-toast__dismiss" aria-label={t("notice.dismiss")} onClick={onDismiss}>
        <Icons.X size={12} />
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
  const column = (entries: readonly NarrationItem[], slot: "narration-text" | "narration-cards") =>
    entries.length ? (
      <div
        className="narration-slot narration-slot--compact"
        data-slot={slot}
        data-security-dock={securityDockActive || undefined}
      >
        {entries.map((item) => (
          <CompactToast
            key={`${item.id}:${item.panel ? "panel" : "notice"}`}
            item={item}
            nowMs={nowMs}
            selected={selected?.id === item.id}
            prompt={isPromptEffect(item)}
            onOpen={() => setSelected(narration.get(item.id) ?? item)}
            onDismiss={() => dismiss(item)}
          />
        ))}
      </div>
    ) : null;
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
        </Dialog>
      ) : null}
    </>
  );
}
