import { useState, type CSSProperties } from "react";
import { CoverThumb } from "@/design/cards";
import { Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { COLORS } from "@/design/theme";
import { displayCoverArt, displayCoverCard, type DeckListing } from "@/game/decks";
import { HomeCard } from "@/home/HomeCard";
import { HomeMatchQueue } from "@/home/HomeMatchQueue";
import { HomeRankedSummary } from "@/home/HomeRankedSummary";
import { useTranslation } from "@/i18n/useTranslation";

const QUEUE_STORAGE_KEY = "aegis:home-match-queue";

function getInitialQueue(): HomeMatchQueue {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored === HomeMatchQueue.RANKED.value) {
      return HomeMatchQueue.RANKED.value;
    }
  } catch {}
  return HomeMatchQueue.CASUAL.value;
}

type HomeNextMatchCardParams = {
  deck: DeckListing | undefined;
  accountId?: string;
  rankedEnabled: boolean;
  onFindMatch: (queue: HomeMatchQueue) => void;
  onPractice: () => void;
  onPrivateMatch: () => void;
  onChangeDeck: () => void;
  onOpenRanked?: () => void;
};

export function HomeNextMatchCard({
  deck,
  accountId,
  rankedEnabled,
  onFindMatch,
  onPractice,
  onPrivateMatch,
  onChangeDeck,
  onOpenRanked,
}: HomeNextMatchCardParams) {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<HomeMatchQueue>(getInitialQueue);
  const selectedQueue = rankedEnabled ? queue : HomeMatchQueue.CASUAL.value;
  const rankedSelected = selectedQueue === HomeMatchQueue.RANKED.value;

  function handleQueueChange(next: HomeMatchQueue) {
    setQueue(next);
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, next);
    } catch {}
  }

  const matchIcon = rankedSelected ? Icons.Trophy : Icons.Search;
  const queueLabel = t(rankedSelected ? "home.next.findRanked" : "home.next.findCasual");
  const matchLabel = rankedEnabled ? queueLabel : t("home.next.find");

  return (
    <HomeCard
      className="home-next"
      title={t("home.next.title")}
      description={t("home.next.description")}
      action={{ label: t("home.next.change"), onClick: onChangeDeck }}
    >
      {deck ? (
        <div className="home-next__deck">
          <span
            className="home-tcg-card home-next__cover"
            style={{ "--deck-color": COLORS[deck.color].base } as CSSProperties}
          >
            <CoverThumb
              coverCardId={displayCoverCard(deck)}
              artId={displayCoverArt(deck)}
              sigilColor={deck.color}
              sigilSize={48}
            />
          </span>
          <div className="home-next__info">
            <h3>{deck.name}</h3>
            <div className="home-facts">
              <span>
                <Icons.Cards size={14} aria-hidden="true" />
                {t("common.cards", { count: deck.mainDeck.length })}
              </span>
              <span>
                <Icons.Hexagon size={14} aria-hidden="true" />
                {t("home.next.eggs", { count: deck.eggDeck.length })}
              </span>
            </div>
            <span className="home-color-dots" aria-hidden="true">
              <i style={{ background: COLORS[deck.color].base }} />
            </span>
          </div>
        </div>
      ) : (
        <div className="home-empty">
          <Icons.Cards size={22} aria-hidden="true" />
          <p>
            <strong>{t("home.next.noDeck")}</strong>
          </p>
        </div>
      )}
      {rankedEnabled ? (
        <div className="home-tabs-list" role="group" aria-label={t("home.next.queueAria")}>
          {Object.values(HomeMatchQueue).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={selectedQueue === option.value}
              onClick={() => handleQueueChange(option.value)}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      ) : null}
      {rankedSelected ? (
        <HomeRankedSummary key={accountId} signedIn={accountId !== undefined} onOpenRanked={onOpenRanked} />
      ) : null}
      <div className="home-next__actions">
        <Button size="lg" full icon={matchIcon} onClick={() => onFindMatch(selectedQueue)}>
          {matchLabel}
        </Button>
        <div className="home-next__row">
          <Button variant="secondary" icon={Icons.Bot} onClick={onPractice}>
            {t("home.next.bot")}
          </Button>
          <Button variant="secondary" icon={Icons.Plus} onClick={onPrivateMatch}>
            {t("home.next.room")}
          </Button>
        </div>
      </div>
    </HomeCard>
  );
}
