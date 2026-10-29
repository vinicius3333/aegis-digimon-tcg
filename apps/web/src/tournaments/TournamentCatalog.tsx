import { CommunityHubNav } from "@/community/CommunityHubNav";
import { CommunityHubSection } from "@/community/CommunityHubSection";
import { Panel } from "@/design/surfaces";
import "@/screens/community/community.css";
import "@/tournaments/tournamentCategories.css";
import { TournamentCategory } from "@aegis/shared/tournaments/TournamentCategory";
import { useCallback, useId, useState } from "react";
import { Alert, Button, Eyebrow } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { deckFormatLabel } from "@/screens/deckFormatLabel";
import { tournamentApi, type ApiError } from "@/tournaments/client";
import { usePolledRequest } from "@/tournaments/hooks";
import { reasonKey } from "@/tournaments/labels";
import { serverNow } from "@/tournaments/serverClock";
import { TournamentAgendaItem } from "@/tournaments/TournamentAgendaItem";
import { TournamentCatalogSection } from "@/tournaments/TournamentCatalogSection";
import { TournamentCatalogTab } from "@/tournaments/TournamentCatalogTab";
import { TournamentCategoryHelp } from "@/tournaments/TournamentCategoryHelp";
import { TournamentNextAction } from "@/tournaments/TournamentNextAction";
import type { TournamentListing } from "@/tournaments/types";
import { CircuitCatalogSection } from "@/tournaments/circuits/CircuitCatalogSection";

type Props = {
  accountId: string | undefined;
  accountIsAdmin?: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onOpenCircuit?: (id: string) => void;
  onCreateCircuit?: () => void;
  onDecks: () => void;
  onRoadmap: () => void;
};
const POLL_MS = 15000;

export function TournamentCatalog({
  accountId,
  accountIsAdmin = false,
  onOpen,
  onCreate,
  onOpenCircuit = () => undefined,
  onCreateCircuit = () => undefined,
  onDecks,
  onRoadmap,
}: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [tournaments, setTournaments] = useState<TournamentListing[]>();
  const [error, setError] = useState<ApiError>();
  const [tab, setTab] = useState<TournamentCatalogTab>(TournamentCatalogTab.UPCOMING.value);
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("");
  const load = useCallback((signal: AbortSignal) => tournamentApi.list(signal), []);
  const apply = useCallback((result: Awaited<ReturnType<typeof tournamentApi.list>>) => {
    if (result.ok) {
      setTournaments(result.value);
      setError(undefined);
    } else {
      setError(result.error);
    }
  }, []);
  const { refresh } = usePolledRequest(load, apply, POLL_MS);
  const now = serverNow();
  const formats = [...new Set(tournaments?.map((event) => event.format ?? "standard"))];
  const search = normalizeSearch(query);
  const filtered = tournaments?.filter((event) => {
    const closed = isClosed(event);
    if (tab === TournamentCatalogTab.UPCOMING.value && closed) {
      return false;
    }
    if (tab === TournamentCatalogTab.FINISHED.value && !closed) {
      return false;
    }
    if (tab === TournamentCatalogTab.MINE.value && (!accountId || (!event.myEntry && event.createdBy !== accountId))) {
      return false;
    }
    return (
      (!format || (event.format ?? "standard") === format) &&
      normalizeSearch(`${event.name} ${event.description ?? ""}`).includes(search)
    );
  });
  const sections = Object.values(TournamentCatalogSection)
    .map((section) => ({
      section,
      events:
        filtered?.filter((event) => (event.category ?? TournamentCategory.COMMUNITY.value) === section.value) ?? [],
    }))
    .filter(({ events }) => events.length > 0);
  const next = tournaments
    ?.filter(
      (event) =>
        !isClosed(event) && event.myEntry && ["registered", "checked_in", "active"].includes(event.myEntry.status),
    )
    .sort(
      (first, second) =>
        getActionPriority(first, now) - getActionPriority(second, now) || first.startsAt - second.startsAt,
    )[0];
  const tabs = Object.values(TournamentCatalogTab).filter(
    (entry) => entry.value !== TournamentCatalogTab.MINE.value || accountId,
  );
  let heading = t("tournaments.catalog.upcomingEvents");
  if (tab === TournamentCatalogTab.MINE.value) {
    heading = t("tournaments.catalog.mine");
  } else if (tab === TournamentCatalogTab.FINISHED.value) {
    heading = t("tournaments.catalog.finished");
  }

  let emptyCopy = t("tournaments.catalog.emptyReadOnly");
  if (tournaments?.length) {
    emptyCopy = t("tournaments.catalog.noResults");
  } else if (accountId) {
    emptyCopy = t("tournaments.catalog.empty");
  }

  return (
    <section className="tournaments-catalog-view" aria-label={t("tournaments.catalog.title")}>
      <Panel as="div" className="community-hero">
        <div className="community-hero__header">
          <div className="community-hero__copy">
            <Eyebrow>{t("community.eyebrow")}</Eyebrow>
            <h1 className="aegis-page-title">{t("tournaments.title")}</h1>
            <p>{t("tournaments.catalog.subtitle")}</p>
          </div>
          <label className="community-search" htmlFor={`${id}-search`}>
            <Icons.Search size={16} />
            <span className="aegis-sr-only">{t("tournaments.catalog.search")}</span>
            <input
              id={`${id}-search`}
              type="search"
              value={query}
              placeholder={t("tournaments.catalog.search")}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <CommunityHubNav
          section={CommunityHubSection.TOURNAMENTS.value}
          onDecks={onDecks}
          onRoadmap={onRoadmap}
          onTournaments={() => undefined}
        />
        <div className="community-toolbar tournaments-catalog-toolbar">
          <div className="community-segmented" role="group" aria-label={t("tournaments.catalog.views")}>
            {tabs.map((entry) => (
              <button
                key={entry.value}
                type="button"
                className={tab === entry.value ? "is-selected" : undefined}
                aria-pressed={tab === entry.value}
                onClick={() => setTab(entry.value)}
              >
                {t(entry.labelKey)}
              </button>
            ))}
          </div>
          <label className="tournaments-format-filter" htmlFor={`${id}-format`}>
            <span className="aegis-sr-only">{t("tournaments.catalog.filterFormat")}</span>
            <select id={`${id}-format`} value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="">{t("tournaments.catalog.allFormats")}</option>
              {formats.map((value) => (
                <option key={value} value={value}>
                  {deckFormatLabel(value, t)}
                </option>
              ))}
            </select>
          </label>
          {accountId ? (
            <Button className="tournaments-catalog-create" icon={Icons.Plus} onClick={onCreate}>
              {t("tournaments.catalog.create")}
            </Button>
          ) : null}
        </div>
      </Panel>
      {error ? (
        <Alert tone="danger" title={t("tournaments.error.load")}>
          {t(reasonKey(error.code) ?? "tournaments.reason.unknown", { code: error.code })}
        </Alert>
      ) : null}
      {tournaments === undefined && !error ? <p role="status">{t("common.loading")}</p> : null}
      {next && accountId && tab !== TournamentCatalogTab.FINISHED.value ? (
        <TournamentNextAction
          key={next.id}
          tournament={next}
          canCheckIn={canCheckIn(next, now)}
          onOpen={onOpen}
          onChanged={() => void refresh()}
        />
      ) : null}
      {tab === TournamentCatalogTab.UPCOMING.value ? (
        <CircuitCatalogSection isAdmin={accountIsAdmin} onOpen={onOpenCircuit} onCreate={onCreateCircuit} />
      ) : null}
      <div className="tournaments-agenda-heading">
        <h2>{heading}</h2>
        <span>
          <Icons.Clock size={14} />
          {t("tournaments.catalog.localTime")}
        </span>
      </div>
      {filtered?.length === 0 ? (
        <div className="tournaments-empty">
          <span className="tournaments-empty__icon">
            <Icons.Calendar size={26} />
          </span>
          <strong className="tournaments-empty__title">
            {t(tournaments?.length ? "tournaments.catalog.noResultsTitle" : "tournaments.catalog.emptyTitle")}
          </strong>
          <p className="tournaments-empty__copy">{emptyCopy}</p>
        </div>
      ) : null}
      {sections.map(({ section, events }) => (
        <section
          key={section.value}
          className="tournaments-category-section"
          aria-labelledby={`${id}-${section.value}-heading`}
        >
          <header className="tournaments-category-section__header">
            <h3 id={`${id}-${section.value}-heading`}>{t(section.headingKey)}</h3>
            <span className="tournaments-category-section__count">
              <span aria-hidden="true">{events.length}</span>
              <span className="aegis-sr-only">{t("tournaments.catalog.section.count", { count: events.length })}</span>
            </span>
            <TournamentCategoryHelp category={section.value} />
          </header>
          <ul className="tournaments-agenda">
            {events.map((event) => (
              <TournamentAgendaItem key={event.id} tournament={event} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function isClosed(event: TournamentListing): boolean {
  return event.status === "finished" || event.status === "cancelled";
}

function canCheckIn(event: TournamentListing, now: number): boolean {
  const entry = event.myEntry;
  return (
    entry?.status === "registered" &&
    (event.status === "registration" || event.status === "check_in") &&
    (entry.checkInOpensAt === null || now >= entry.checkInOpensAt) &&
    (entry.checkInClosesAt === null || now <= entry.checkInClosesAt)
  );
}

function getActionPriority(event: TournamentListing, now: number): number {
  if (canCheckIn(event, now)) {
    return 0;
  }
  if (event.myEntry?.status === "active") {
    return 1;
  }
  if (event.myEntry?.status === "checked_in") {
    return 2;
  }
  return 3;
}
