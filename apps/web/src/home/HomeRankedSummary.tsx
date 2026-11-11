import { useId, type MouseEvent } from "react";
import type { RankedLeaderboard } from "@aegis/shared/ranked/RankedContracts";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { getRankedSeasonLabel } from "@/ranked/getRankedSeasonLabel";
import { useRankedRequest } from "@/ranked/useRankedRequest";
import { pathForRoute } from "@/routes";

type HomeRankedSummaryParams = {
  signedIn: boolean;
  onOpenRanked?: () => void;
};

export function HomeRankedSummary({ signedIn, onOpenRanked }: HomeRankedSummaryParams) {
  const { t, locale } = useTranslation();
  const { data, error } = useRankedRequest<RankedLeaderboard>(signedIn ? "/ranked/leaderboard" : null, { poll: false });
  const detailId = useId();

  function handleOpenRanked(event: MouseEvent<HTMLAnchorElement>) {
    if (!onOpenRanked || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onOpenRanked();
  }

  let detail = t("common.loading");
  if (!signedIn || error) {
    detail = t("home.next.rankedUnavailable");
  } else if (data?.mine === null) {
    detail = t("home.next.rankedEmpty");
  }

  return (
    <a
      href={pathForRoute({ screen: "ranked" })}
      className="home-next__ranked-summary"
      onClick={handleOpenRanked}
      aria-label={t("home.next.rankedLink")}
      aria-describedby={detailId}
    >
      <span className="home-next__ranked-icon" aria-hidden="true">
        <Icons.Trophy size={16} />
      </span>
      <span id={detailId} className="home-next__ranked-content" aria-live="polite">
        {data?.mine ? (
          <>
            <span className="home-next__ranked-primary">
              <strong>{t(`ranked.tier.${data.mine.tier}`)}</strong>
              <span className="home-next__ranked-rating">
                {t("home.next.rankedScore", { rating: data.mine.rating.toLocaleString(locale) })}
              </span>
            </span>
            <span className="home-next__ranked-secondary">
              {getRankedSeasonLabel({ seasonId: data.season.id, t })}
              {data.mine.position === null ? "" : ` · #${data.mine.position}`}
            </span>
          </>
        ) : (
          <>
            <strong className="home-next__ranked-primary" aria-hidden="true">
              {t("home.next.rankedLink")}
            </strong>
            <span className="home-next__ranked-secondary">{detail}</span>
          </>
        )}
      </span>
      <span className="home-next__ranked-arrow" aria-hidden="true">
        <Icons.ChevronRight size={16} />
      </span>
    </a>
  );
}
