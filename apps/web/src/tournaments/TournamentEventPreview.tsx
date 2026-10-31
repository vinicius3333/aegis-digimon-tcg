import "@/tournaments/tournamentCatalog.css";
import type { TournamentStructure } from "@aegis/shared";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { structureKey } from "@/tournaments/labels";

type TournamentEventPreviewParams = {
  name: string;
  official: boolean;
  passwordProtected: boolean;
  startsAt: number;
  structure: TournamentStructure;
  topCut: boolean;
  bestOf: 1 | 3;
  maxPlayers: number;
};

export function TournamentEventPreview({
  name,
  official,
  passwordProtected,
  startsAt,
  structure,
  topCut,
  bestOf,
  maxPlayers,
}: TournamentEventPreviewParams) {
  const { t, locale } = useTranslation();
  const trimmed = name.trim();
  const when = Number.isFinite(startsAt)
    ? new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(startsAt)
    : "";
  return (
    <section className="tournaments-card create-tournament__preview" aria-label={t("tournaments.create.previewCard")}>
      <div
        className="tournaments-feature__banner create-tournament__preview-banner"
        data-official={official || undefined}
      >
        <Icons.Trophy size={56} aria-hidden="true" />
        <div className="tournaments-feature__badges">
          <span className="tournaments-glass">
            {t(official ? "tournaments.category.official" : "tournaments.category.community")}
          </span>
          {passwordProtected ? (
            <span className="tournaments-glass">
              <Icons.Lock size={11} aria-hidden="true" />
              {t("tournaments.catalog.withPassword")}
            </span>
          ) : null}
        </div>
      </div>
      <div className="create-tournament__preview-body">
        <strong className="create-tournament__preview-name" data-placeholder={trimmed ? undefined : true}>
          {trimmed || t("tournaments.create.title")}
        </strong>
        <div className="tournaments-feature__facts">
          {when ? (
            <span>
              <Icons.Calendar size={14} aria-hidden="true" />
              {when}
            </span>
          ) : null}
          <span>
            <Icons.LayoutGrid size={14} aria-hidden="true" />
            {t(structureKey(structure))}
            {topCut ? ` + ${t("tournaments.badge.topCut")}` : ""}
          </span>
          <span>
            <Icons.Swords size={14} aria-hidden="true" />
            {t("tournaments.bestOf", { count: bestOf })}
          </span>
        </div>
        <div className="tournaments-capacity">
          <div className="tournaments-capacity__label">
            <span>{t("home.tournaments.players")}</span>
            <span>
              <b>0</b> / {maxPlayers}
            </span>
          </div>
          <span className="tournaments-progress" aria-hidden="true">
            <span style={{ width: 0 }} />
          </span>
        </div>
      </div>
    </section>
  );
}
