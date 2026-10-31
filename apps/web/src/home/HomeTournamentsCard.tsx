import { useState } from "react";
import { Badge, Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { HomeCard } from "@/home/HomeCard";
import { HomeTournamentFilter } from "@/home/HomeTournamentFilter";
import { useTranslation } from "@/i18n/useTranslation";
import { statusKey, structureKey } from "@/tournaments/labels";
import type { TournamentListing } from "@/tournaments/types";

const HOME_TOURNAMENT_COUNT = 4;

type HomeTournamentsCardParams = {
  tournaments: TournamentListing[] | undefined;
  onOpen: (id: string) => void;
  onViewAll: () => void;
  onCreate?: () => void;
};

export function HomeTournamentsCard({ tournaments, onOpen, onViewAll, onCreate }: HomeTournamentsCardParams) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<HomeTournamentFilter>(HomeTournamentFilter.ALL.value);
  const entry = Object.values(HomeTournamentFilter).find((candidate) => candidate.value === filter);
  const statuses: readonly string[] = entry?.statuses ?? [];
  const visible = (tournaments ?? [])
    .filter((tournament) => statuses.includes(tournament.status))
    .sort((first, second) => first.startsAt - second.startsAt)
    .slice(0, HOME_TOURNAMENT_COUNT);
  return (
    <HomeCard
      className="home-events"
      title={t("home.tournaments.title")}
      description={t("home.tournaments.description")}
      tools={
        <div className="home-filters">
          <div className="home-segmented" role="group" aria-label={t("home.tournaments.filterAria")}>
            {Object.values(HomeTournamentFilter).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
          {onCreate ? (
            <Button size="sm" variant="secondary" icon={Icons.Plus} onClick={onCreate}>
              {t("tournaments.catalog.create")}
            </Button>
          ) : null}
        </div>
      }
      action={{ label: t("home.viewAll"), onClick: onViewAll }}
    >
      {visible.length === 0 ? (
        <div className="home-empty">
          <Icons.Trophy size={22} aria-hidden="true" />
          <p>
            <strong>{t("home.tournaments.empty")}</strong>
          </p>
        </div>
      ) : (
        <ul className="home-rail home-events__grid">
          {visible.map((tournament) => (
            <HomeTournament key={tournament.id} tournament={tournament} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </HomeCard>
  );
}

type HomeTournamentParams = {
  tournament: TournamentListing;
  onOpen: (id: string) => void;
};

function HomeTournament({ tournament, onOpen }: HomeTournamentParams) {
  const { t, locale } = useTranslation();
  const open = tournament.status === "registration" || tournament.status === "check_in";
  const full = tournament.registeredCount >= tournament.maxPlayers;
  const capacity = Math.min(100, Math.max(0, (tournament.registeredCount / tournament.maxPlayers) * 100));
  const startsAt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(tournament.startsAt));
  return (
    <li className="home-event">
      <div className="home-event__head">
        <h3>{tournament.name}</h3>
        <Badge tone={open ? "success" : "primary"}>{t(statusKey(tournament.status))}</Badge>
      </div>
      <div className="home-facts">
        <span>
          <Icons.Calendar size={14} aria-hidden="true" />
          {startsAt}
        </span>
        <span>
          <Icons.LayoutGrid size={14} aria-hidden="true" />
          {t(structureKey(tournament.structure))}
        </span>
        <span>
          <Icons.Swords size={14} aria-hidden="true" />
          {t("tournaments.bestOf", { count: tournament.bestOf })}
        </span>
        {tournament.passwordProtected ? (
          <span>
            <Icons.Lock size={14} aria-hidden="true" />
            {t("tournaments.catalog.withPassword")}
          </span>
        ) : null}
      </div>
      <div className="home-capacity">
        <div className="home-capacity__label">
          <span>{t("home.tournaments.players")}</span>
          <span>
            <b>{tournament.registeredCount}</b> / {tournament.maxPlayers}
          </span>
        </div>
        <div
          className="home-progress"
          role="progressbar"
          aria-valuenow={tournament.registeredCount}
          aria-valuemin={0}
          aria-valuemax={tournament.maxPlayers}
          aria-label={t("tournaments.slots", {
            registered: tournament.registeredCount,
            max: tournament.maxPlayers,
          })}
        >
          <span style={{ width: `${capacity}%` }} />
        </div>
      </div>
      <div className="home-event__foot">
        <Button size="sm" variant={open && !full ? "primary" : "secondary"} full onClick={() => onOpen(tournament.id)}>
          {getTournamentActionLabel({ open, full, t })}
        </Button>
      </div>
    </li>
  );
}

type TournamentActionLabelParams = {
  open: boolean;
  full: boolean;
  t: ReturnType<typeof useTranslation>["t"];
};

function getTournamentActionLabel({ open, full, t }: TournamentActionLabelParams): string {
  if (open && full) {
    return t("tournaments.catalog.full");
  }
  if (open) {
    return t("home.tournaments.signUp");
  }
  return t("tournaments.catalog.view");
}
