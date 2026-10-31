import { hasAccountCapability } from "@aegis/shared/account/hasAccountCapability";
import type { TournamentSpectateTarget } from "@/tournaments/TournamentSpectateTarget";
import { TournamentCatalog } from "@/tournaments/TournamentCatalog";
/* The tournaments area: catalog, creation and detail. The app shell can control the view so each
   page has a stable URL; local state remains available for isolated component tests. */

import type { TournamentGameTicket } from "@aegis/shared/tournaments/TournamentGameTicket";
import { useEffect, useState } from "react";
import { Alert } from "@/design/primitives";
import type { DeckListing } from "../game/decks";
import { useTranslation } from "../i18n";
import { accountApi } from "../account/client";
import { CreateTournamentForm } from "./CreateTournamentForm";
import { TournamentDetail } from "./TournamentDetail";
import type { TournamentRoute } from "../routes";
import { CircuitDetail } from "@/tournaments/circuits/CircuitDetail";
import { CreateCircuitForm } from "@/tournaments/circuits/CreateCircuitForm";
import "./tournaments.css";

export function TournamentsScreen({
  decks,
  view,
  onViewChange,
  onJoinGame,
  onWatchMatch,
  onDecks = () => undefined,
  onRoadmap = () => undefined,
}: {
  onDecks?: () => void;
  onRoadmap?: () => void;
  decks: readonly DeckListing[];
  onJoinGame?: (ticket: TournamentGameTicket) => void;
  onWatchMatch?: (target: TournamentSpectateTarget) => void;
  view?: TournamentRoute;
  onViewChange?: (view: TournamentRoute) => void;
}) {
  const { t } = useTranslation();
  const [localView, setLocalView] = useState<TournamentRoute>({ kind: "catalog" });
  const [account, setAccount] = useState<{
    id: string;
    displayName: string;
    isAdmin: boolean;
    canCreateOfficial: boolean;
  } | null>();
  const activeView = view ?? localView;
  const setView = onViewChange ?? setLocalView;

  useEffect(() => {
    let cancelled = false;
    void accountApi
      .me()
      .then((value) => {
        if (!cancelled) {
          setAccount(
            value && {
              id: value.id,
              displayName: value.displayName,
              isAdmin: value.isAdmin,
              canCreateOfficial: hasAccountCapability({
                roles: value.roles,
                capability: "canOrganizeOfficialTournaments",
              }),
            },
          );
        }
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (activeView.kind === "catalog") {
    return (
      <div className="community-page tournaments-community">
        <div className="community-column aegis-page-sheet">
          <TournamentCatalog
            accountId={account?.id}
            canCreateCircuit={account?.isAdmin === true || account?.canCreateOfficial === true}
            onOpen={(id) => setView({ kind: "detail", id })}
            onCreate={() => setView({ kind: "create" })}
            onOpenCircuit={(id) => setView({ kind: "circuit", id })}
            onCreateCircuit={() => setView({ kind: "createCircuit" })}
            onDecks={onDecks}
            onRoadmap={onRoadmap}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="tournaments-page">
      <div className="tournaments-page__sheet aegis-page-sheet aegis-page-sheet--padded">
        {activeView.kind === "create" ? (
          <header className="tournaments-page__head">
            <h1>{t("tournaments.title")}</h1>
            <p>{t("tournaments.subtitle")}</p>
          </header>
        ) : null}

        {activeView.kind === "create" && account ? (
          <CreateTournamentForm
            canCreateOfficial={account.canCreateOfficial}
            onCreated={(tournament) => setView({ kind: "detail", id: tournament.id })}
            onCancel={() => setView({ kind: "catalog" })}
          />
        ) : null}

        {activeView.kind === "create" && account === null ? (
          <Alert tone="warning" title={t("account.signInTitle")}>
            {t("tournaments.detail.signInRequired")}
          </Alert>
        ) : null}

        {activeView.kind === "createCircuit" && account && (account.isAdmin || account.canCreateOfficial) ? (
          <CreateCircuitForm
            onCreated={(circuit) => setView({ kind: "circuit", id: circuit.id })}
            onCancel={() => setView({ kind: "catalog" })}
          />
        ) : null}

        {activeView.kind === "createCircuit" && account && !account.isAdmin && !account.canCreateOfficial ? (
          <Alert tone="warning" title={t("tournaments.circuits.organizerOnlyTitle")}>
            {t("tournaments.circuits.organizerOnly")}
          </Alert>
        ) : null}

        {activeView.kind === "createCircuit" && account === null ? (
          <Alert tone="warning" title={t("account.signInTitle")}>
            {t("tournaments.detail.signInRequired")}
          </Alert>
        ) : null}

        {activeView.kind === "circuit" ? (
          <CircuitDetail
            id={activeView.id}
            accountIsAdmin={account?.isAdmin === true}
            onBack={() => setView({ kind: "catalog" })}
            onOpenTournament={(id) => setView({ kind: "detail", id })}
          />
        ) : null}

        {activeView.kind === "detail" ? (
          <TournamentDetail
            id={activeView.id}
            onDecks={onDecks}
            onJoinGame={onJoinGame}
            onWatchMatch={onWatchMatch}
            accountId={account?.id}
            accountDisplayName={account?.displayName}
            accountIsAdmin={account?.isAdmin === true}
            decks={decks}
            tab={activeView.tab}
            onTabChange={(tab) => setView({ kind: "detail", id: activeView.id, tab })}
            onBack={() => setView({ kind: "catalog" })}
          />
        ) : null}
      </div>
    </div>
  );
}
