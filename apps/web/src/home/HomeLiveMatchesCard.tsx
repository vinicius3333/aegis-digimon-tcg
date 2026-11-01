import type { LiveMatchPlayerPreview } from "@aegis/shared/protocol/LiveMatchPlayerPreview";
import { CoverThumb } from "@/design/cards";
import { getCardDefinition } from "@aegis/shared";
import { getTranslatedCardName } from "@/i18n/getTranslatedCardName";
import { useCardTranslations } from "@/i18n/useCardTranslations";
import { GameMode } from "@aegis/shared/manual/GameMode";
import type { LiveMatch } from "@aegis/shared/protocol/LiveMatch";
import { Avatar, Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { HomeCard } from "@/home/HomeCard";
import { useTranslation } from "@/i18n/useTranslation";
import { deckFormatLabel } from "@/screens/deckFormatLabel";
import { useLiveMatches } from "@/screens/useLiveMatches";

const HOME_LIVE_MATCH_COUNT = 4;

type HomeLiveMatchesCardParams = {
  onWatch: (spectatorCode: string) => void;
  onViewAll: () => void;
};

export function HomeLiveMatchesCard({ onWatch, onViewAll }: HomeLiveMatchesCardParams) {
  const { t } = useTranslation();
  const { page } = useLiveMatches({ pageSize: HOME_LIVE_MATCH_COUNT });
  const matches = page?.matches ?? [];
  const now = Date.now();
  return (
    <HomeCard
      className="home-live"
      title={
        <>
          {t("spectator.liveTitle")}
          {page && page.total > 0 ? <span className="home-count-badge">{page.total}</span> : null}
        </>
      }
      description={t("home.live.description")}
      action={{ label: t("home.viewAll"), onClick: onViewAll }}
    >
      {matches.length === 0 ? (
        <div className="home-empty">
          <Icons.Eye size={22} aria-hidden="true" />
          <p>
            <strong>{t("spectator.liveEmpty")}</strong>
            <span>{t("spectator.liveEmptyHint")}</span>
          </p>
        </div>
      ) : (
        <ul className="home-rail home-live__grid">
          {matches.map((match) => (
            <HomeLiveMatch key={match.spectatorCode} match={match} now={now} onWatch={onWatch} />
          ))}
        </ul>
      )}
    </HomeCard>
  );
}

type HomeLiveMatchParams = {
  match: LiveMatch;
  now: number;
  onWatch: (spectatorCode: string) => void;
};

function HomeLiveMatch({ match, now, onWatch }: HomeLiveMatchParams) {
  const { t } = useTranslation();
  const first = match.players[0] || t("log.player", { n: 1 });
  const second = match.players[1] || t("log.player", { n: 2 });
  const minutes = Math.max(1, Math.floor((now - match.startedAt) / 60_000));
  return (
    <li className="home-live__match">
      <div className="home-live__arena">
        <div className="home-live__artwork" aria-hidden="true">
          <HomeLiveCardArt preview={match.playerPreviews?.[0]} />
          <HomeLiveCardArt preview={match.playerPreviews?.[1]} />
        </div>
        <div className="home-live__top">
          <span className="home-live-chip">
            <i aria-hidden="true" />
            {t("home.live.badge")}
          </span>
          <span className="home-glass-badge">
            {match.gameMode === GameMode.MANUAL.value ? t("manual.title") : deckFormatLabel(match.format, t)}
          </span>
        </div>
      </div>
      <div className="home-live__duel">
        <HomeLivePlayer name={first} preview={match.playerPreviews?.[0]} />
        <span className="home-live__versus">{t("spectator.liveVersus")}</span>
        <HomeLivePlayer name={second} preview={match.playerPreviews?.[1]} />
      </div>
      <div className="home-live__foot">
        <span className="home-meta">
          <Icons.Clock size={14} aria-hidden="true" />
          {t("spectator.liveMinutes", { minutes })}
        </span>
        <span className="home-meta" aria-label={t("spectator.liveSpectators", { count: match.spectators })}>
          <Icons.Eye size={14} aria-hidden="true" />
          {match.spectators}
        </span>
        <Button
          size="sm"
          icon={Icons.Play}
          aria-label={t("spectator.liveWatch", { first, second })}
          onClick={() => onWatch(match.spectatorCode)}
        >
          {t("spectator.watch")}
        </Button>
      </div>
    </li>
  );
}

type HomeLivePlayerParams = {
  name: string;
  preview?: LiveMatchPlayerPreview;
};

function HomeLivePlayer({ name, preview }: HomeLivePlayerParams) {
  const translations = useCardTranslations();
  const printedName = preview?.cardId ? getCardDefinition(preview.cardId)?.nameEn : undefined;
  const cardName = printedName ? getTranslatedCardName({ name: printedName, translations }) : undefined;
  return (
    <span className="home-live__player">
      <Avatar name={name} size={34} avatarId={preview?.avatarId} avatarUrl={preview?.avatarUrl} />
      <span className="home-live__identity">
        <b title={name}>{name}</b>
        {cardName ? <small title={cardName}>{cardName}</small> : null}
      </span>
    </span>
  );
}

type HomeLiveCardArtParams = Pick<HomeLivePlayerParams, "preview">;

function HomeLiveCardArt({ preview }: HomeLiveCardArtParams) {
  return (
    <span className="home-live__art">
      <CoverThumb coverCardId={preview?.cardId} artId={preview?.artId} objectPosition="50% 24%" />
    </span>
  );
}
