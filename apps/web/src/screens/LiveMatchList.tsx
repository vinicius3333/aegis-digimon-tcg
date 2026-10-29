import { GameMode } from "@aegis/shared/manual/GameMode";
import type { LiveMatch } from "@aegis/shared/protocol/LiveMatch";
import { Badge, Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { deckFormatLabel } from "@/screens/deckFormatLabel";

export function LiveMatchList({
  matches,
  total,
  now,
  onWatch,
  onShowMore,
}: {
  matches: LiveMatch[];
  total: number;
  now: number;
  onWatch: (spectatorCode: string) => void;
  onShowMore?: () => void;
}) {
  const { t } = useTranslation();
  if (matches.length === 0) {
    return (
      <div className="live-matches__empty">
        <Icons.Eye size={28} aria-hidden="true" />
        <p>
          <strong>{t("spectator.liveEmpty")}</strong>
        </p>
        <p>{t("spectator.liveEmptyHint")}</p>
      </div>
    );
  }
  const remaining = total - matches.length;
  return (
    <>
      <ul className="live-matches__list">
        {matches.map((match) => {
          const first = match.players[0] || t("log.player", { n: 1 });
          const second = match.players[1] || t("log.player", { n: 2 });
          const minutes = Math.max(1, Math.floor((now - match.startedAt) / 60_000));
          return (
            <li key={match.spectatorCode} className="live-match">
              <p className="live-match__players">
                <strong>{first}</strong>
                <span className="live-match__versus">{t("spectator.liveVersus")}</span>
                <strong>{second}</strong>
              </p>
              <div className="live-match__meta">
                <Badge>{deckFormatLabel(match.format, t)}</Badge>
                {match.gameMode === GameMode.MANUAL.value ? <Badge>{t("manual.title")}</Badge> : null}
                <span className="live-match__stat">
                  <Icons.Clock size={14} aria-hidden="true" />
                  {t("spectator.liveMinutes", { minutes })}
                </span>
                <span
                  className="live-match__stat"
                  aria-label={t("spectator.liveSpectators", { count: match.spectators })}
                >
                  <Icons.Eye size={14} aria-hidden="true" />
                  {match.spectators}
                </span>
              </div>
              <Button
                className="live-match__watch"
                variant="secondary"
                size="sm"
                icon={Icons.Eye}
                aria-label={t("spectator.liveWatch", { first, second })}
                onClick={() => onWatch(match.spectatorCode)}
              >
                <span className="live-match__watch-label">{t("spectator.watch")}</span>
              </Button>
            </li>
          );
        })}
      </ul>
      {onShowMore && remaining > 0 ? (
        <button type="button" className="live-matches__more" onClick={onShowMore}>
          {t("spectator.liveShowMore", { count: remaining })}
        </button>
      ) : null}
    </>
  );
}
