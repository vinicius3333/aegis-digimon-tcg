import { Button, Dialog } from "../design/primitives";
import { useTranslation } from "../i18n";
import type { LogLine } from "./matchLog";
import { CardLinkedText } from "./cardLinks";

function LogLineText({ line, onOpenCard }: { line: LogLine; onOpenCard?: (cardId: string) => void }) {
  return (
    <p>
      <CardLinkedText text={line.text} cardIds={line.cardIds} onOpenCard={onOpenCard} />
    </p>
  );
}

/**
 * The play log: every action the match has
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
