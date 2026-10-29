import { TournamentCategoryBadge } from "@/tournaments/TournamentCategoryBadge";
import { Badge, Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { deckFormatLabel } from "@/screens/deckFormatLabel";
import { banlistModeKey, statusKey, structureKey } from "@/tournaments/labels";
import type { TournamentListing } from "@/tournaments/types";

type Props = { tournament: TournamentListing; onOpen: (id: string) => void };

export function TournamentAgendaItem({ tournament, onOpen }: Props) {
  const { t, locale } = useTranslation();
  const date = new Date(tournament.startsAt);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(date);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
  const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" }).format(date);
  const capacity = Math.min(100, Math.max(0, (tournament.registeredCount / tournament.maxPlayers) * 100));
  const closed = tournament.status === "finished" || tournament.status === "cancelled";
  const full = tournament.registeredCount >= tournament.maxPlayers;

  return (
    <li>
      <article className="tournaments-agenda-item">
        <time className="tournaments-agenda-date" dateTime={date.toISOString()} aria-label={fullDate}>
          <span>{weekday}</span>
          <strong>{day}</strong>
          <span>{time}</span>
        </time>
        <div className="tournaments-agenda-info">
          <div className="tournaments-agenda-title">
            <h4>{tournament.name}</h4>
            <TournamentCategoryBadge category={tournament.category} explained={false} />
            {tournament.circuitId ? <Badge tone="primary">{t("tournaments.circuits.badge")}</Badge> : null}
            {tournament.passwordProtected ? (
              <span className="tournaments-agenda-lock">
                <Icons.Lock size={14} />
                {t("tournaments.catalog.withPassword")}
              </span>
            ) : null}
          </div>
          {tournament.description ? <p className="tournaments-description">{tournament.description}</p> : null}
          <p className="tournaments-agenda-rules">
            <span>{deckFormatLabel(tournament.format ?? "standard", t)}</span>
            <span>
              <span>{t(structureKey(tournament.structure))}</span>
              {tournament.topCutEnabled ? (
                <>
                  {" "}
                  + <span>{t("tournaments.badge.topCut")}</span>
                </>
              ) : null}
            </span>
            <span>{t("tournaments.bestOf", { count: tournament.bestOf })}</span>
          </p>
          <p className="tournaments-agenda-notes">
            {tournament.allowBots ? <span>{t("tournaments.badge.bots")}</span> : null}
            <span>
              {tournament.banlistPolicy.mode === "as_of_set"
                ? t("tournaments.banlist.asOfSet", { set: tournament.banlistPolicy.setId })
                : t(banlistModeKey(tournament.banlistPolicy))}
            </span>
          </p>
        </div>
        <div className="tournaments-agenda-status">
          <Badge tone={closed ? "neutral" : "success"}>{t(statusKey(tournament.status))}</Badge>
          <div className="tournaments-agenda-capacity">
            <span>
              {t("tournaments.slots", { registered: tournament.registeredCount, max: tournament.maxPlayers })}
            </span>
            <div className="tournaments-capacity-track" aria-hidden="true">
              <span style={{ width: `${capacity}%` }} />
            </div>
          </div>
        </div>
        <Button className="tournaments-agenda-open" variant="secondary" onClick={() => onOpen(tournament.id)}>
          {full && tournament.status === "registration" ? t("tournaments.catalog.full") : t("tournaments.catalog.view")}
          <Icons.ArrowRight size={16} />
        </Button>
      </article>
    </li>
  );
}
