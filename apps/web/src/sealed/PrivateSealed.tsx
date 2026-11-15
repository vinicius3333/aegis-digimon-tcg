import { SealedProductSelector } from "@/sealed/SealedProductSelector";
import { PrivateSidebar } from "@/screens/PrivateSidebar";
import { listSealedProducts } from "@aegis/shared/sealed/listSealedProducts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  PrivateSealedView,
  PrivateSealedReady,
  PrivateSealedGameTicket,
} from "@aegis/shared/sealed/private/PrivateSealedContracts";
import { PrivateSealedStatus as Status } from "@aegis/shared/sealed/private/PrivateSealedStatus";
import { SealedPoolBuilder } from "@/sealed/SealedPoolBuilder";
import { requestPrivateSealed } from "@/sealed/requestPrivateSealed";
import { createLazyComponent } from "@/net/createLazyComponent";
import { useTranslation } from "@/i18n/useTranslation";
import { Button, Alert, Field } from "@/design/primitives";
import { usePolledRequest } from "@/tournaments/hooks";
import type { AegisJoinOptions } from "@/net/types";
import "@/sealed/sealed.css";

type Props = {
  displayName: string;
  onClose: () => void;
  onStartGame?: (ticket: PrivateSealedGameTicket) => void;
  embedded?: boolean;
  initialSub?: "create" | "join";
  onEntered?: () => void;
};
const storageKey = "aegis:private-sealed-code";
type Resource = Readonly<{ code: string; version: number; active: boolean }>;
type ReplaceResourceParams = { code: string; active?: boolean };
const GameScreen = createLazyComponent({ load: loadGameScreen, pick: (module) => module.GameScreen });
export function PrivateSealed({
  displayName,
  onClose,
  onStartGame,
  embedded = false,
  initialSub = "create",
  onEntered,
}: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    void loadGameScreen().catch(() => undefined);
  }, []);
  const [resource, setResource] = useState<Resource>(() => {
    const invitation = new URLSearchParams(location.search).get("privateSealed");
    const saved = sessionStorage.getItem(storageKey) ?? "";
    return { code: invitation && invitation.toUpperCase() !== saved ? "" : saved, version: 0, active: true };
  });
  const currentResource = useRef(resource);
  const { code } = resource;
  const isCurrent = useCallback(() => currentResource.current === resource && resource.active, [resource]);
  function replaceResource({ code: nextCode, active = true }: ReplaceResourceParams) {
    const next = { code: nextCode, version: currentResource.current.version + 1, active };
    currentResource.current = next;
    setResource(next);
  }
  const [invitation, setInvitation] = useState(() => new URLSearchParams(location.search).get("privateSealed") ?? "");
  useEffect(() => {
    if (code) {
      onEntered?.();
    }
  }, [code, onEntered]);
  const [sub, setSub] = useState<"create" | "join">(() =>
    new URLSearchParams(location.search).has("privateSealed") ? "join" : initialSub,
  );

  const [setId, setSetId] = useState(() => listSealedProducts()[0]!.value);
  const [view, setView] = useState<PrivateSealedView>();
  const [ticket, setTicket] = useState<PrivateSealedGameTicket>();
  const [error, setError] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [lookupUnavailable, setLookupUnavailable] = useState(false);
  const [resultPending, setResultPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const closed = view?.status === Status.COMPLETE.value || view?.status === Status.CANCELLED.value;
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!code || !isCurrent()) {
        return null;
      }
      const result = await requestPrivateSealed<PrivateSealedView>({ code, signal });
      return { resource, result };
    },
    [code, resource, isCurrent],
  );
  const apply = useCallback((loaded: Awaited<ReturnType<typeof load>>) => {
    if (!loaded || loaded.resource !== currentResource.current || !loaded.resource.active) {
      return;
    }
    const result = loaded.result;
    if (result.ok) {
      setView(result.value);
      setLoadFailed(false);
      setLookupUnavailable(false);
      setResultPending(false);
    } else {
      setLoadFailed(result.error.code !== "result_pending");
      setLookupUnavailable(
        ((result.error.status === 404 || result.error.status === 409) && result.error.code === "series_not_found") ||
          (result.error.status === 403 && result.error.code === "seat_required"),
      );
      setResultPending(result.error.code === "result_pending");
    }
  }, []);
  const { refresh: refreshRequest } = usePolledRequest(
    load,
    apply,
    2000,
    resource.active && !!code && !ticket && !closed,
  );
  const refresh = useCallback(async () => {
    if (!isCurrent()) {
      return;
    }
    await refreshRequest();
  }, [isCurrent, refreshRequest]);
  const loadPool = useCallback(
    async (signal: AbortSignal) => {
      if (!isCurrent()) {
        return { ok: false as const, error: { status: 0, code: "client_resource_superseded" } };
      }
      const result = await requestPrivateSealed<PrivateSealedView>({ code, signal });
      if (!result.ok) {
        return result;
      }
      return { ok: true as const, value: result.value.pool };
    },
    [code, isCurrent],
  );
  const readyDeck = useCallback(
    async (input: PrivateSealedReady) => {
      if (!isCurrent()) {
        return { ok: false as const, error: { status: 0, code: "client_resource_superseded" } };
      }
      const result = await requestPrivateSealed<PrivateSealedView>({ code, action: "ready", body: input });
      if (!result.ok) {
        return result;
      }
      if (isCurrent()) {
        setView(result.value);
        setError(false);
      }
      return { ok: true as const, value: result.value.pool };
    },
    [code, isCurrent],
  );
  async function enter(action?: "join") {
    if (!isCurrent()) {
      return;
    }
    setBusy(true);
    const result = await requestPrivateSealed<PrivateSealedView>({
      code: action ? invitation.trim().toUpperCase() : undefined,
      action,
      body: { name: displayName, requestId, ...(!action ? { setId } : {}) },
    });
    if (!isCurrent()) {
      return;
    }
    setBusy(false);
    if (!result.ok) {
      setError(true);
      return;
    }
    sessionStorage.setItem(storageKey, result.value.code);
    updateInvitationQuery(result.value.code);
    setInvitation(result.value.code);
    replaceResource({ code: result.value.code });
    setView(result.value);
    setError(false);
    setLoadFailed(false);
    setLookupUnavailable(false);
  }
  async function start() {
    if (!isCurrent()) {
      return;
    }
    setBusy(true);
    const result = await requestPrivateSealed<PrivateSealedGameTicket>({ code, action: "start", body: {} });
    if (!isCurrent()) {
      return;
    }
    setBusy(false);
    if (result.ok) {
      if (onStartGame) {
        onStartGame(result.value);
      } else {
        setTicket(result.value);
      }
      setError(false);
    } else {
      setError(result.error.code !== "result_pending");
      setResultPending(result.error.code === "result_pending");
    }
    void refresh();
  }
  async function cancel() {
    if (!isCurrent()) {
      return;
    }
    const result = await requestPrivateSealed<PrivateSealedView>({ code, action: "cancel", body: {} });
    if (!isCurrent()) {
      return;
    }
    if (result.ok) {
      setView(result.value);
      setTicket(undefined);
    } else {
      setError(true);
    }
  }
  function leave() {
    replaceResource({ code: "" });
    setBusy(false);
    sessionStorage.removeItem(storageKey);
    updateInvitationQuery();
    setView(undefined);
    setTicket(undefined);
    setRequestId(crypto.randomUUID());
    onClose();
  }
  function back() {
    if (closed || !code) {
      leave();
      return;
    }
    replaceResource({ code, active: false });
    setBusy(false);
    onClose();
  }
  function forget() {
    replaceResource({ code: "" });
    setBusy(false);
    sessionStorage.removeItem(storageKey);
    updateInvitationQuery();
    setInvitation("");
    setView(undefined);
    setTicket(undefined);
    setError(false);
    setLoadFailed(false);
    setLookupUnavailable(false);
    setResultPending(false);
    setRequestId(crypto.randomUUID());
    setSub(initialSub);
  }
  const joinOptions = useMemo<AegisJoinOptions>(
    () => ({ displayName, deck: { mainDeck: [], eggDeck: [] }, privateSealedGame: ticket }),
    [displayName, ticket],
  );
  if (ticket) {
    return (
      <GameScreen
        key={ticket.gameId}
        joinOptions={joinOptions}
        identityColor="Red"
        onExit={() => {
          if (!isCurrent()) {
            return;
          }
          setTicket(undefined);
          void refresh();
        }}
        onRematch={() => {
          if (!isCurrent()) {
            return;
          }
          setTicket(undefined);
          void refresh();
        }}
      />
    );
  }
  return (
    <div className={embedded ? undefined : "lobby-page"}>
      <section className="sealed-builder private-sealed" aria-label={t("sealed.private.title")}>
        {!code ? (
          <details>
            <summary>{t("deckFormat.sealed")} · BO3</summary>
            <p>{t("sealed.private.policy")}</p>
          </details>
        ) : null}
        {resultPending ? <Alert tone="info">{t("sealed.private.resultPending")}</Alert> : null}
        {error || loadFailed ? <Alert tone="danger">{t("sealed.private.error")}</Alert> : null}
        {!code ? (
          <>
            <PrivateSidebar
              t={t}
              sub={sub}
              onSub={setSub}
              roomCode={invitation}
              onRoomCode={setInvitation}
              codeLength={18}
              codeLabel={t("sealed.private.code")}
              disabled={busy}
            />
            {sub === "create" ? (
              <>
                <SealedProductSelector value={setId} onChange={setSetId} disabled={busy} />
                <Button disabled={busy} onClick={() => void enter()}>
                  {t("sealed.private.create")}
                </Button>
              </>
            ) : (
              <Button disabled={busy || !/^[a-f0-9]{18}$/i.test(invitation.trim())} onClick={() => void enter("join")}>
                {t("sealed.private.join")}
              </Button>
            )}
          </>
        ) : (
          <>
            <header className="private-sealed__header">
              <h2>{t("sealed.private.title")}</h2>
              <details className="private-sealed__invitation">
                <summary>
                  {t("sealed.private.code")}: <strong data-testid="private-sealed-code">{code}</strong>
                </summary>
                <Field
                  label={t("sealed.private.link")}
                  readOnly
                  value={`${location.origin}/play?privateSealed=${code}`}
                  onFocus={(event) => event.target.select()}
                />
              </details>
            </header>
            {view ? (
              <>
                <div className="private-sealed__status">
                  <p role="status">
                    {view.players.join(" · ")} · {view.score.join(" – ")} · {t("sealed.private.game")} {view.gameNumber}
                  </p>
                  {view.players.length < 2 ? <p>{t("sealed.private.waiting")}</p> : null}
                </div>
                {closed ? (
                  <p role="status">
                    {t(view.status === Status.COMPLETE.value ? "sealed.private.complete" : "sealed.private.cancelled")}
                    {view.winner !== null ? ` · ${t("sealed.private.winner")}: ${view.players[view.winner]}` : ""}
                  </p>
                ) : (
                  <>
                    {!lookupUnavailable && view.players.length === 2 && view.status !== Status.PLAYING.value ? (
                      <SealedPoolBuilder
                        key={`${code}:${resource.version}:${view.pool.window}`}
                        loadPool={loadPool}
                        readyDeck={readyDeck}
                        policy={t("sealed.private.policy")}
                        waitingText={t("sealed.private.waiting")}
                        onReady={() => void refresh()}
                      />
                    ) : null}
                  </>
                )}
                {view.reason === "game_interrupted" ? <p>{t("sealed.private.interrupted")}</p> : null}
                {view.reason === "build_timeout" ? <p>{t("sealed.private.buildExpired")}</p> : null}
                {view.reason === "player_cancelled" ? <p>{t("sealed.private.forfeited")}</p> : null}
              </>
            ) : (
              <p>{t("sealed.loading")}</p>
            )}
          </>
        )}
        <footer className="private-sealed__actions">
          {code && lookupUnavailable ? (
            <Button variant="secondary" onClick={forget}>
              {t("sealed.private.forget")}
            </Button>
          ) : null}
          {view && !closed && !lookupUnavailable ? (
            <>
              <Button disabled={busy || resultPending || view.players.length < 2} onClick={() => void start()}>
                {t(view.status === Status.PLAYING.value ? "sealed.private.resume" : "sealed.private.start")}
              </Button>
              <Button variant="secondary" onClick={() => void cancel()}>
                {t("sealed.private.cancel")}
              </Button>
            </>
          ) : null}
          <Button variant="secondary" onClick={back}>
            {t("sealed.private.back")}
          </Button>
        </footer>
      </section>
    </div>
  );
}

function loadGameScreen() {
  return import("@/game/GameScreen");
}

function updateInvitationQuery(code?: string) {
  const url = new URL(location.href);
  if (code) {
    url.searchParams.set("privateSealed", code);
  } else {
    url.searchParams.delete("privateSealed");
  }
  history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
