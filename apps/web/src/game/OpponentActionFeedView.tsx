import { Button, Dialog } from "../design/primitives";
import { Sigil } from "../design/cards";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import type { LogLine } from "./boardModel";
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
      <span className="opponent-action-feed__icon" aria-hidden="true"><ActionIcon item={current} /></span>
      <ActionCopy item={current} />
      <span className="aegis-sr-only" role="status" aria-live="polite">
        {t(current.titleKey, current.titleParams)}
      </span>
      {pendingCount > 0 ? (
        <span className="opponent-action-feed__pending">
          {t("feed.pendingActions", { count: pendingCount })}
        </span>
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

export function MatchHistorySheet({ log, onClose }: { log: readonly LogLine[]; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog className="match-history-sheet game-modal__panel" labelledBy="aegis-match-history-title" onClose={onClose}>
      <header className="match-history-sheet__header">
        <div>
          <span>{t("game.matchLog")}</span>
          <h2 id="aegis-match-history-title">{t("feed.historyTitle")}</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>{t("common.close")}</Button>
      </header>
      <div className="match-history-sheet__list">
        {log.length === 0 ? <p>{t("feed.noHistory")}</p> : null}
        {log.map((line, index) => (
          <div className="match-history-sheet__line" data-kind={line.kind} key={`${index}:${line.text}`}>
            <span aria-hidden="true" />
            <p>{line.text}</p>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
