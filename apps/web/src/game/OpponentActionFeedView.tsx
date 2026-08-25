import { getCardDefinition } from "@aegis/shared";
import { Button, Dialog } from "../design/primitives";
import { Sigil } from "../design/cards";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import type { LogLine } from "./boardModel";
import { logSegments } from "./matchLogLinks";
import type { OpponentActionItem } from "./opponentActionFeed";

function ActionCopy({ item }: { item: OpponentActionItem }) {
  const { t } = useTranslation();
  return (
    <div className="opponent-action-feed__copy">
      <strong>{t(item.titleKey, item.titleParams)}</strong>
      {item.detailKey ? <small>{t(item.detailKey, item.detailParams)}</small> : null}
      {item.detailText ? <small>{item.detailText}</small> : null}
    </div>
  );
}

function ActionIcon({ item }: { item: OpponentActionItem }) {
  if (item.cardId) return <Sigil cardId={item.cardId} size={24} />;
  return <Icons.Swords size={19} />;
}

export function OpponentActionFeed({
  current,
  trail,
  pendingCount,
  onOpenHistory,
}: {
  current?: OpponentActionItem;
  trail: readonly OpponentActionItem[];
  pendingCount: number;
  onOpenHistory?: () => void;
}) {
  const { t } = useTranslation();
  if (!current) return null;

  const content = (
    <>
      <span className="opponent-action-feed__icon" aria-hidden="true">
        <ActionIcon item={current} />
      </span>
      <ActionCopy item={current} />
      <span className="aegis-sr-only" role="status" aria-live="polite">
        {t(current.titleKey, current.titleParams)}
      </span>
      {pendingCount > 0 ? (
        <span className="opponent-action-feed__pending">{t("feed.pendingActions", { count: pendingCount })}</span>
      ) : null}
    </>
  );

  return (
    <div className="opponent-action-feed" data-testid="opponent-action-feed">
      <div className="opponent-action-feed__trail" aria-hidden="true">
        {trail.map((item, index) => (
          <div className="opponent-action-feed__trail-item" data-depth={index + 1} key={item.id}>
            <ActionCopy item={item} />
          </div>
        ))}
      </div>
      {onOpenHistory ? (
        <button
          className="opponent-action-feed__current"
          type="button"
          aria-label={t("feed.openHistory")}
          onClick={onOpenHistory}
        >
          {content}
        </button>
      ) : (
        <div className="opponent-action-feed__current">{content}</div>
      )}
    </div>
  );
}

/** The card names inside one line, keyed by the name the line actually printed. */
function namedCards(line: LogLine): Map<string, string> {
  const named = new Map<string, string>();
  for (const cardId of line.cardIds ?? []) {
    const name = getCardDefinition(cardId)?.nameEn;
    if (name) named.set(name, cardId);
  }
  return named;
}

function LogLineText({ line, onOpenCard }: { line: LogLine; onOpenCard?: (cardId: string) => void }) {
  const { t } = useTranslation();
  const segments = logSegments(line.text, namedCards(line));
  return (
    <p>
      {segments.map((segment, index) =>
        segment.cardId && onOpenCard ? (
          <button
            key={index}
            type="button"
            className="play-log__card"
            aria-label={t("feed.openCard", { card: segment.text })}
            onClick={() => onOpenCard(segment.cardId!)}
          >
            {segment.text}
          </button>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

/**
 * The play log (`PlayLog.cs` in a `SideBar.cs` drawer): every action the match has
 * narrated, newest first, in a panel that slides out of the board's right edge and
 * back into it. Card names are links — clicking one opens the card, which is how
 * the reference client lets a player check what just hit them without leaving the
 * board.
 */
export function PlayLogSidebar({
  log,
  onClose,
  onOpenCard,
}: {
  log: readonly LogLine[];
  onClose: () => void;
  onOpenCard?: (cardId: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog className="play-log game-modal__panel" labelledBy="aegis-play-log-title" onClose={onClose}>
      <header className="play-log__header">
        <div>
          <span>{t("game.matchLog")}</span>
          <h2 id="aegis-play-log-title">{t("feed.logTitle")}</h2>
        </div>
        <Button size="sm" variant="ghost" aria-label={t("feed.closeLog")} onClick={onClose}>
          {t("common.close")}
        </Button>
      </header>
      <div className="play-log__list">
        {log.length === 0 ? <p className="play-log__empty">{t("feed.noHistory")}</p> : null}
        {log.map((line, index) => (
          <div className="play-log__line" data-kind={line.kind} key={`${index}:${line.text}`}>
            <span aria-hidden="true" />
            <LogLineText line={line} onOpenCard={onOpenCard} />
          </div>
        ))}
      </div>
    </Dialog>
  );
}
