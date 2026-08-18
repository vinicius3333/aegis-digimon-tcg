/* The tournaments area: catalog, creation and detail. The app shell can control the view so each
   page has a stable URL; local state remains available for isolated component tests. */

import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, Panel } from "../design/primitives";
import { Icons } from "../design/icons";
import type { DeckListing } from "../game/decks";
import { useTranslation } from "../i18n";
import { accountApi } from "../account/client";
import { tournamentApi, type ApiError } from "./client";
import { CreateTournamentForm } from "./CreateTournamentForm";
import { usePolledRequest } from "./hooks";
import { banlistModeKey, reasonKey, statusKey, structureKey } from "./labels";
import { TournamentDetail } from "./TournamentDetail";
import type { TournamentListing } from "./types";
import type { TournamentRoute } from "../routes";
import "./tournaments.css";

const CATALOG_POLL_MS = 15_000;

export function TournamentsScreen({ decks, view, onViewChange }: { decks: readonly DeckListing[]; view?: TournamentRoute; onViewChange?: (view: TournamentRoute) => void }) {
  const { t } = useTranslation();
  const [localView, setLocalView] = useState<TournamentRoute>({ kind: "catalog" });
  const [account, setAccount] = useState<{ id: string; displayName: string; isAdmin: boolean } | null>();
  const activeView = view ?? localView;
  const setView = onViewChange ?? setLocalView;

  useEffect(() => {
    let cancelled = false;
    void accountApi.me()
      .then((value) => { if (!cancelled) setAccount(value && { id: value.id, displayName: value.displayName, isAdmin: value.isAdmin }); })
      .catch(() => { if (!cancelled) setAccount(null); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="tournaments-page">
      <header className="tournaments-page__head">
        <h1>{t("tournaments.title")}</h1>
        <p>{t("tournaments.subtitle")}</p>
      </header>

      {activeView.kind === "catalog" ? (
        <Catalog canCreate={account?.isAdmin === true} onOpen={(id) => setView({ kind: "detail", id })} onCreate={() => setView({ kind: "create" })} />
      ) : null}

      {activeView.kind === "create" && account?.isAdmin ? (
        <CreateTournamentForm onCreated={(tournament) => setView({ kind: "detail", id: tournament.id })} onCancel={() => setView({ kind: "catalog" })} />
      ) : null}

      {activeView.kind === "create" && account !== undefined && !account?.isAdmin ? (
        <Alert tone="warning" title={t("tournaments.create.adminOnly")}>{t("tournaments.create.adminOnlyDescription")}</Alert>
      ) : null}

      {activeView.kind === "detail" ? (
        <TournamentDetail id={activeView.id} accountId={account?.id} accountDisplayName={account?.displayName} accountIsAdmin={account?.isAdmin === true} decks={decks} onBack={() => setView({ kind: "catalog" })} />
      ) : null}
    </div>
  );
}

function Catalog({ canCreate, onOpen, onCreate }: { canCreate: boolean; onOpen: (id: string) => void; onCreate: () => void }) {
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState<TournamentListing[]>();
  const [error, setError] = useState<ApiError>();

  const load = useCallback((signal: AbortSignal) => tournamentApi.list(signal), []);
  const apply = useCallback((result: Awaited<ReturnType<typeof tournamentApi.list>>) => {
    if (result.ok) { setTournaments(result.value); setError(undefined); }
    else setError(result.error);
  }, []);
  usePolledRequest(load, apply, CATALOG_POLL_MS);

  return (
    <section aria-label={t("tournaments.catalog.title")}>
      <div className="tournaments-page__actions">
        {canCreate && tournaments?.length !== 0 ? <Button onClick={onCreate}>{t("tournaments.catalog.create")}</Button> : null}
      </div>
      {error ? <Alert tone="danger" title={t("tournaments.error.load")}>{reasonKey(error.code) ? t(reasonKey(error.code)!) : t("tournaments.reason.unknown", { code: error.code })}</Alert> : null}
      {tournaments === undefined && !error ? <p role="status">{t("common.loading")}</p> : null}
      {tournaments?.length === 0 ? (
        <div className="tournaments-empty">
          <span className="tournaments-empty__icon"><Icons.Calendar size={26} /></span>
          <strong className="tournaments-empty__title">{t("tournaments.catalog.emptyTitle")}</strong>
          <p className="tournaments-empty__copy">{t(canCreate ? "tournaments.catalog.empty" : "tournaments.catalog.emptyReadOnly")}</p>
          {canCreate ? <Button icon={Icons.Plus} onClick={onCreate}>{t("tournaments.catalog.create")}</Button> : null}
        </div>
      ) : null}
      <ul className="tournaments-catalog">
        {tournaments?.map((tournament) => (
          <li key={tournament.id}>
            <Panel className="tournaments-card">
              <div className="tournaments-card__head">
                <h2>{tournament.name}</h2>
                <Badge tone="primary">{t(statusKey(tournament.status))}</Badge>
              </div>
              <p className="tournaments-card__meta">
                <span>{new Date(tournament.startsAt).toLocaleString()}</span>
                <span>{t("tournaments.slots", { registered: tournament.registeredCount, max: tournament.maxPlayers })}</span>
              </p>
              <div className="tournaments-badges">
                <Badge>{t(structureKey(tournament.structure))}</Badge>
                <Badge>{t("tournaments.bestOf", { count: tournament.bestOf })}</Badge>
                {tournament.topCutEnabled ? <Badge tone="success">{t("tournaments.badge.topCut")}</Badge> : null}
                {tournament.allowBots ? <Badge tone="warning">{t("tournaments.badge.bots")}</Badge> : null}
                <Badge>
                  {tournament.banlistPolicy.mode === "as_of_set"
                    ? t("tournaments.banlist.asOfSet", { set: tournament.banlistPolicy.setId })
                    : t(banlistModeKey(tournament.banlistPolicy))}
                </Badge>
              </div>
              <Button size="sm" variant="secondary" onClick={() => onOpen(tournament.id)}>{t("tournaments.catalog.open")}</Button>
            </Panel>
          </li>
        ))}
      </ul>
    </section>
  );
}
