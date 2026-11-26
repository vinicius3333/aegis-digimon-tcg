import type { DeckFormat } from "@aegis/shared/deckFormat";
import type { RankedMetaCounters } from "@aegis/shared/ranked/RankedContracts";
import { useState } from "react";
import { CommunityCard } from "@/community/CommunityCard";
import { Button } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { RankedDeckIdentity } from "@/ranked/RankedDeckIdentity";
import { formatRankedWinrate } from "@/ranked/formatRankedWinrate";
import { useRankedRequest } from "@/ranked/useRankedRequest";
import { getArchetypeName } from "@/screens/community/getArchetypeName";
import { getWinrateTone } from "@/screens/community/getWinrateTone";
import { verdictForInterval } from "@/screens/deckSimulation/verdictForInterval";
import { WinRateBand } from "@/screens/deckSimulation/WinRateBand";
import "@/ranked/ranked.css";
import "@/screens/deckBuilder.css";

const COUNTER_DAYS = 28;
const DAY_MS = 86_400_000;

type CommunityCountersParams = {
  format: DeckFormat;
};

export function CommunityCounters({ format }: CommunityCountersParams) {
  const { t, locale } = useTranslation();
  const [now] = useState(Date.now);
  const query = new URLSearchParams({
    format,
    origin: "ranked",
    from: String(now - COUNTER_DAYS * DAY_MS),
    until: String(now),
  });
  const { data, error, refresh } = useRankedRequest<RankedMetaCounters[]>(`/ranked/counters?${query}`, {
    poll: false,
  });
  const getName = (name: string) => getArchetypeName({ name, locale, unknownLabel: t("ranked.season.unknown") });
  const formatRate = (value: number) => formatRankedWinrate({ value, locale });
  return (
    <CommunityCard title={t("community.counters.title")} description={t("community.counters.description")}>
      {error ? (
        <div className="community-empty" role="alert">
          <p>{t("ranked.season.error")}</p>
          <Button size="sm" variant="secondary" onClick={refresh}>
            {t("ranked.season.retry")}
          </Button>
        </div>
      ) : null}
      {!data && !error ? <p role="status">{t("common.loading")}</p> : null}
      {data && data.length === 0 ? <p className="community-muted">{t("ranked.season.empty")}</p> : null}
      {data && data.length > 0 ? (
        <ul className="community-counters">
          {data.map((deck) => (
            <li key={deck.archetype} className="community-counters__deck">
              <RankedDeckIdentity
                name={getName(deck.archetype)}
                coverCardId={deck.coverCardId}
                colors={deck.colors}
                detail={t("community.counters.share", { share: formatRate(deck.share) })}
              />
              {deck.counters.length === 0 ? (
                <p className="community-muted community-counters__none">{t("community.counters.none")}</p>
              ) : (
                <ol
                  className="community-counters__list"
                  aria-label={t("community.counters.against", { deck: getName(deck.archetype) })}
                >
                  {deck.counters.map((counter) => {
                    const verdict = verdictForInterval(counter.interval);
                    return (
                      <li key={counter.archetype} className="community-counter">
                        <span className="community-counter__name">{getName(counter.archetype)}</span>
                        <WinRateBand score={counter.winrate} interval={counter.interval} compact />
                        <span className="community-winrate" data-tone={getWinrateTone(counter.winrate)}>
                          {formatRate(counter.winrate)}
                        </span>
                        <span className="deck-matchup__verdict-chip" data-verdict={verdict}>
                          {t(`deckMatchup.verdictShort.${verdict}`)}
                        </span>
                        <small className="community-counter__sample">
                          {t("community.counters.sample", {
                            games: counter.games.toLocaleString(locale),
                            players: counter.pilots.toLocaleString(locale),
                            low: formatRate(counter.interval[0]),
                            high: formatRate(counter.interval[1]),
                          })}
                        </small>
                      </li>
                    );
                  })}
                </ol>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {data && data.length > 0 ? (
        <p className="community-muted community-meta-note">{t("community.counters.method")}</p>
      ) : null}
    </CommunityCard>
  );
}
