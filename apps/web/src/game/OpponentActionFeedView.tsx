import { Button, Dialog } from "../design/primitives";
import { Sigil } from "../design/cards";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import type { LogLine } from "./boardModel";
import { CardLinkedText } from "./cardLinks";
import type { OpponentActionItem } from "./opponentActionFeed";

function ActionCopy({
  item,
  live = false,
  onOpenCard,
}: {
  item: OpponentActionItem;
  /** The newest line announces itself, so there is no second sr-only copy to read past. */
  live?: boolean;
  onOpenCard?: (cardId: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="opponent-action-feed__copy"
      {...(live ? { role: "status" as const, "aria-live": "polite" as const } : {})}
    >
      <strong>
        <CardLinkedText text={t(item.titleKey, item.titleParams)} cardIds={item.titleCardIds} onOpenCard={onOpenCard} />
      </strong>
      {item.detailKey ? <small>{t(item.detailKey, item.detailParams)}</small> : null}
      {item.detailText ? (
        <small>
          <CardLinkedText text={item.detailText} cardIds={item.detailCardIds} onOpenCard={onOpenCard} />
        </small>
      ) : null}
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
  onOpenCard,
}: {
  current?: OpponentActionItem;
  trail: readonly OpponentActionItem[];
  pendingCount: number;
  onOpenHistory?: () => void;
  onOpenCard?: (cardId: string) => void;
}) {
  const { t } = useTranslation();
  if (!current) return null;

  // The whole line used to be the button that opened the history, which left a card
  // link with nowhere valid to go: a button inside a button is neither valid markup
  // nor reachable by a keyboard. The history is its own small button beside the copy,
  // so every line — newest and trail alike — can link the cards it names.
  return (
    <div className="opponent-action-feed" data-testid="opponent-action-feed">
      <div className="opponent-action-feed__trail">
        {trail.map((item, index) => (
          <div className="opponent-action-feed__trail-item" data-depth={index + 1} key={item.id}>
            <ActionCopy item={item} onOpenCard={onOpenCard} />
          </div>
        ))}
      </div>
      <div className="opponent-action-feed__current">
        <span className="opponent-action-feed__icon" aria-hidden="true">
          <ActionIcon item={current} />
        </span>
        <ActionCopy item={current} live onOpenCard={onOpenCard} />
        <span className="opponent-action-feed__aside">
          {pendingCount > 0 ? (
            <span className="opponent-action-feed__pending">{t("feed.pendingActions", { count: pendingCount })}</span>
          ) : null}
          {onOpenHistory ? (
            <button
              className="opponent-action-feed__history"
              type="button"
              aria-label={t("feed.openHistory")}
              onClick={onOpenHistory}
            >
              <Icons.ScrollText size={16} />
            </button>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function LogLineText({ line, onOpenCard }: { line: LogLine; onOpenCard?: (cardId: string) => void }) {
  return (
    <p>
      <CardLinkedText text={line.text} cardIds={line.cardIds} onOpenCard={onOpenCard} />
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
