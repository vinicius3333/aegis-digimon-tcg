/* One tournament: schedule, participants, the frozen banlist, matches, standings, the player's
   own actions and — for the creator — the schedule controls. Polls every 5 s while visible. */

import { useCallback, useEffect, useState } from "react";
import { AccountPanel } from "../account/AccountPanel";
import { Alert, Badge, Button, Panel } from "../design/primitives";
import type { DeckListing } from "../game/decks";
import { useTranslation } from "../i18n";
import { banlistCardName } from "./banlistPreview";
import { tournamentApi, type ApiError } from "./client";
import { entryActions, ownParticipant } from "./entry";
import { usePolledRequest } from "./hooks";
import { banlistModeKey, matchStatusKey, participantStatusKey, reasonKey, restrictionKey, statusKey, structureKey, violationMessage, windowKey } from "./labels";
import { MyMatchPanel } from "./MyMatchPanel";
import { TopCutBracket } from "./TopCutBracket";
import type { TournamentDetail as TournamentDetailPayload, TournamentWindows } from "./types";

const DETAIL_POLL_MS = 5_000;

export function TournamentDetail({ id, accountId, accountDisplayName, accountIsAdmin = false, decks, onBack }: { id: string; accountId: string | undefined; accountDisplayName?: string; accountIsAdmin?: boolean; decks: readonly DeckListing[]; onBack: () => void }) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<TournamentDetailPayload>();
  const [loadError, setLoadError] = useState<ApiError>();
  const [actionError, setActionError] = useState<ApiError>();
  const [savedDeckId, setSavedDeckId] = useState(() => decks[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const load = useCallback((signal: AbortSignal) => tournamentApi.detail(id, signal), [id]);
  const apply = useCallback((result: Awaited<ReturnType<typeof tournamentApi.detail>>) => {
    if (result.ok) { setDetail(result.value); setLoadError(undefined); }
    else setLoadError(result.error);
  }, []);
  const { refresh } = usePolledRequest(load, apply, DETAIL_POLL_MS);

  useEffect(() => { if (!savedDeckId && decks[0]) setSavedDeckId(decks[0].id); }, [decks, savedDeckId]);

  const run = async (action: () => Promise<{ ok: boolean; error?: ApiError }>) => {
    setBusy(true);
    setActionError(undefined);
    const result = await action();
    setBusy(false);
    if (!result.ok && result.error) setActionError(result.error);
    void refresh();
  };

  if (loadError && !detail) {
    return (
      <Panel className="tournaments-detail">
        <Alert tone="danger" title={t("tournaments.error.load")}>{describe(loadError, t)}</Alert>
        <Button variant="secondary" onClick={onBack}>{t("tournaments.back")}</Button>
      </Panel>
    );
  }
  if (!detail) return <Panel className="tournaments-detail"><p role="status">{t("common.loading")}</p></Panel>;

  const isOrganizer = accountId !== undefined && detail.createdBy === accountId;
  // What the published state can support. The server re-decides every call; this only stops the
  // UI offering an action its own payload already rules out.
  const own = ownParticipant(detail.participants, accountDisplayName);
  const actions = entryActions(detail, own);
  const banlistLabel = detail.banlistPolicy.mode === "as_of_set"
    ? t("tournaments.banlist.asOfSet", { set: detail.banlistPolicy.setId })
    : t(banlistModeKey(detail.banlistPolicy));

  return (
    <div className="tournaments-detail">
      <div className="tournaments-detail__head">
        <Button variant="secondary" size="sm" onClick={onBack}>{t("tournaments.back")}</Button>
        <h2>{detail.name}</h2>
        <div className="tournaments-badges">
          <Badge tone="primary">{t(statusKey(detail.status))}</Badge>
          <Badge>{t(structureKey(detail.structure))}</Badge>
          <Badge>{t("tournaments.bestOf", { count: detail.bestOf })}</Badge>
          {detail.topCutEnabled ? <Badge tone="success">{t("tournaments.badge.topCut")}</Badge> : null}
          {detail.allowBots ? <Badge tone="warning">{t("tournaments.badge.bots")}</Badge> : null}
          <Badge>{banlistLabel}</Badge>
        </div>
      </div>

      <Panel>
        <h3>{t("tournaments.detail.schedule")}</h3>
        <dl>
          <dt>{t("tournaments.startsAt")}</dt>
          <dd>{new Date(detail.startsAt).toLocaleString()}</dd>
          <dt>{t("tournaments.slotsLabel")}</dt>
          <dd>{t("tournaments.slots", { registered: detail.registeredCount, max: detail.maxPlayers })}</dd>
        </dl>
        {/* The detail payload carries no check-in windows; only POST /windows answers with them,
            so a non-organizer cannot see the schedule beyond the start time yet. */}
        <p className="tournaments-note">{t("tournaments.detail.windowsPending")}</p>
      </Panel>

      <Panel>
        <h3>{t("tournaments.detail.actions")}</h3>
        {accountId === undefined ? (
          <div className="tournaments-detail__signin">
            <p>{t("tournaments.detail.signInRequired")}</p>
            {/* The same sign-in block Settings shows: Discord plus the magic link, so the player
                can act on the message instead of hunting for where accounts live. */}
            <AccountPanel account={null} />
          </div>
        ) : (
          <>
            <div className="aegis-field">
              <label className="aegis-field__label" htmlFor="tournament-deck">{t("tournaments.detail.deck")}</label>
              <select id="tournament-deck" className="aegis-field__control" value={savedDeckId} onChange={(event) => setSavedDeckId(event.target.value)} disabled={decks.length === 0}>
                {decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
              </select>
              {decks.length === 0 ? <span className="aegis-field__message" data-error>{t("tournaments.detail.needDeck")}</span> : null}
            </div>
            <div className="tournaments-detail__actions">
              {actions.register ? <Button disabled={busy || !savedDeckId} onClick={() => void run(() => tournamentApi.register(detail.id, savedDeckId))}>{t("tournaments.detail.register")}</Button> : null}
              {actions.checkIn ? <Button variant="secondary" disabled={busy} onClick={() => void run(() => tournamentApi.checkIn(detail.id))}>{t("tournaments.detail.checkIn")}</Button> : null}
              {actions.drop ? <Button variant="danger" disabled={busy} onClick={() => void run(() => tournamentApi.drop(detail.id))}>{t("tournaments.detail.drop")}</Button> : null}
            </div>
            {!actions.register && !actions.checkIn && !actions.drop ? <p className="tournaments-note">{t("tournaments.detail.noActions")}</p> : null}
            {own ? <p className="tournaments-note">{t("tournaments.detail.yourStatus", { status: t(participantStatusKey(own.status)) })}</p> : null}
          </>
        )}
        {actionError ? (
          <Alert tone="danger" title={t("tournaments.error.action")}>
            {describe(actionError, t)}
            {actionError.violations?.length ? (
              <ul>{actionError.violations.map((violation, index) => { const message = violationMessage(violation); return <li key={index}>{t(message.key, message.params)}</li>; })}</ul>
            ) : null}
          </Alert>
        ) : null}
      </Panel>

      {isOrganizer || accountIsAdmin ? <OrganizerControls id={detail.id} status={detail.status} canManage={isOrganizer} onChanged={refresh} onDeleted={onBack} /> : null}

      <MyMatchPanel detail={detail} accountId={accountId} />

      <TopCutBracket detail={detail} />

      <Panel>
        <h3>{t("tournaments.detail.participants")}</h3>
        {detail.participants.length === 0 ? <p>{t("tournaments.detail.noParticipants")}</p> : (
          <ul className="tournaments-participants">
            {detail.participants.map((participant) => (
              <li key={participant.id}>
                <span>{participant.displayName}</span>
                {participant.kind === "bot" ? <Badge tone="warning">{t("tournaments.participant.bot")}</Badge> : null}
                <Badge>{t(participantStatusKey(participant.status))}</Badge>
                {participant.seed !== null ? <span className="tournaments-seed">#{participant.seed}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <h3>{t("tournaments.detail.banlist")}</h3>
        {detail.banlistPolicy.mode === "none" ? <p>{t("tournaments.detail.banlistNone")}</p> : detail.banlistCards.length === 0 ? <p>{t("tournaments.detail.banlistEmpty")}</p> : (
          <ul className="tournaments-banlist">
            {detail.banlistCards.map((card) => (
              <li key={card.cardId}>
                <span className="tournaments-banlist__name">{banlistCardName(card.cardId)}</span>
                <span className="tournaments-banlist__id">{card.cardId}</span>
                <Badge tone={card.status === "banned" ? "danger" : "warning"}>{t(restrictionKey(card.status))}</Badge>
                <span className="tournaments-banlist__copies">{t("tournaments.detail.copies", { count: card.allowedCopies })}</span>
                {card.pairPartnerIds?.length ? (
                  <span className="tournaments-banlist__pair">{t("tournaments.detail.pairWith", { cards: card.pairPartnerIds.map(banlistCardName).join(", ") })}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <h3>{t("tournaments.detail.matches")}</h3>
        {detail.matches.length === 0 ? <p>{t("tournaments.detail.noMatches")}</p> : (
          <ul className="tournaments-matches">
            {detail.matches.map((match) => (
              <li key={match.id}>
                <span>{t("tournaments.myMatch.round")} {match.round}</span>
                <Badge>{t(matchStatusKey(match.status))}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <h3>{t("tournaments.detail.standings")}</h3>
        {detail.standings?.length ? (
          <ol className="tournaments-standings">
            {detail.standings.map((row) => (
              <li key={row.participantId}>
                <span>#{row.rank}</span>
                <span>{detail.participants.find((p) => p.id === row.participantId)?.displayName ?? row.participantId}</span>
                <span>{t("tournaments.detail.points", { points: row.points })}</span>
              </li>
            ))}
          </ol>
        ) : <p>{t("tournaments.detail.standingsPending")}</p>}
      </Panel>
    </div>
  );
}

function OrganizerControls({ id, status, canManage, onChanged, onDeleted }: { id: string; status: TournamentDetailPayload["status"]; canManage: boolean; onChanged: () => void; onDeleted: () => void }) {
  const { t } = useTranslation();
  const [windows, setWindows] = useState<Partial<TournamentWindows>>({});
  const [error, setError] = useState<ApiError>();
  const [saved, setSaved] = useState<TournamentWindows>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // The server refuses to delete a started event, so the button only shows while it can succeed.
  const deletable = status === "draft" || status === "registration" || status === "check_in";

  const field = (key: keyof TournamentWindows) => (
    <div className="aegis-field" key={key}>
      <label className="aegis-field__label" htmlFor={`window-${key}`}>{t(windowKey(key))}</label>
      <input
        id={`window-${key}`}
        className="aegis-field__control"
        type="datetime-local"
        onChange={(event) => setWindows((current) => ({ ...current, [key]: event.target.value ? new Date(event.target.value).getTime() : null }))}
      />
    </div>
  );

  return (
    <Panel className="tournaments-organizer">
      <h3>{t(canManage ? "tournaments.detail.organizer" : "tournaments.detail.adminControls")}</h3>
      {canManage ? <>
        {(["registrationClosesAt", "checkInOpensAt", "checkInClosesAt"] as const).map(field)}
        <div className="tournaments-detail__actions">
          <Button onClick={() => void tournamentApi.setWindows(id, windows).then((result) => { if (result.ok) { setSaved(result.value); setError(undefined); onChanged(); } else setError(result.error); })}>
            {t("tournaments.detail.saveWindows")}
          </Button>
          <Button variant="secondary" onClick={() => void tournamentApi.closeCheckIn(id).then((result) => { if (result.ok) { setError(undefined); onChanged(); } else setError(result.error); })}>
            {t("tournaments.detail.closeCheckIn")}
          </Button>
        </div>
        {saved ? <p role="status">{t("tournaments.detail.windowsSaved")}</p> : null}
      </> : null}
      {error ? <Alert tone="danger" title={t("tournaments.error.action")}>{describe(error, t)}</Alert> : null}
      {deletable ? (
        <div className="tournaments-organizer__danger">
          {confirmingDelete ? (
            <>
              <p className="tournaments-note">{t("tournaments.detail.deleteConfirm")}</p>
              <div className="tournaments-detail__actions">
                <Button
                  variant="danger"
                  onClick={() => void tournamentApi.remove(id).then((result) => {
                    if (result.ok) { onDeleted(); return; }
                    setError(result.error);
                    setConfirmingDelete(false);
                  })}
                >
                  {t("tournaments.detail.deleteConfirmYes")}
                </Button>
                <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>{t("common.cancel")}</Button>
              </div>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirmingDelete(true)}>{t("tournaments.detail.delete")}</Button>
          )}
        </div>
      ) : null}
    </Panel>
  );
}

function describe(error: ApiError, t: ReturnType<typeof useTranslation>["t"]): string {
  const key = reasonKey(error.code);
  return key ? t(key) : t("tournaments.reason.unknown", { code: error.code });
}
