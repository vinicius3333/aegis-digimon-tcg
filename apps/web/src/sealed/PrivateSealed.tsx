import { SealedProductSelector } from "@/sealed/SealedProductSelector";
import { PrivateSidebar } from "@/screens/PrivateSidebar";
import { listSealedProducts } from "@aegis/shared/sealed/listSealedProducts";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [code, setCode] = useState(() => {
    const invitation = new URLSearchParams(location.search).get("privateSealed");
    const saved = sessionStorage.getItem(storageKey) ?? "";
    return invitation && invitation.toUpperCase() !== saved ? "" : saved;
  });
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
  const [resultPending, setResultPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const closed = view?.status === Status.COMPLETE.value || view?.status === Status.CANCELLED.value;
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!code) {
        return null;
      }
      return requestPrivateSealed<PrivateSealedView>({ code, signal });
    },
    [code],
  );
  const apply = useCallback((result: Awaited<ReturnType<typeof load>>) => {
    if (result?.ok) {
      setView(result.value);
      setLoadFailed(false);
      setResultPending(false);
    } else if (result) {
      setLoadFailed(result.error.code !== "result_pending");
      setResultPending(result.error.code === "result_pending");
    }
  }, []);
  const { refresh } = usePolledRequest(load, apply, 2000, !!code && !ticket && !closed);
  const loadPool = useCallback(
    async (signal: AbortSignal) => {
      const result = await requestPrivateSealed<PrivateSealedView>({ code, signal });
      if (!result.ok) {
        return result;
      }
      return { ok: true as const, value: result.value.pool };
    },
    [code],
  );
  const readyDeck = useCallback(
    async (input: PrivateSealedReady) => {
      const result = await requestPrivateSealed<PrivateSealedView>({ code, action: "ready", body: input });
      if (!result.ok) {
        return result;
      }
      setView(result.value);
      setError(false);
      return { ok: true as const, value: result.value.pool };
    },
    [code],
  );
  async function enter(action?: "join") {
    setBusy(true);
    const result = await requestPrivateSealed<PrivateSealedView>({
      code: action ? invitation.trim().toUpperCase() : undefined,
      action,
      body: { name: displayName, requestId, ...(!action ? { setId } : {}) },
    });
    setBusy(false);
    if (!result.ok) {
      setError(true);
      return;
    }
    sessionStorage.setItem(storageKey, result.value.code);
    setCode(result.value.code);
    setView(result.value);
    setError(false);
  }
  async function start() {
    setBusy(true);
    const result = await requestPrivateSealed<PrivateSealedGameTicket>({ code, action: "start", body: {} });
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
    const result = await requestPrivateSealed<PrivateSealedView>({ code, action: "cancel", body: {} });
    if (result.ok) {
      setView(result.value);
      setTicket(undefined);
    } else {
      setError(true);
    }
  }
  function leave() {
    sessionStorage.removeItem(storageKey);
    setCode("");
    setView(undefined);
    setTicket(undefined);
    setRequestId(crypto.randomUUID());
    onClose();
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
          setTicket(undefined);
          void refresh();
        }}
        onRematch={() => {
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
                    {view.status !== Status.PLAYING.value ? (
                      <SealedPoolBuilder
                        key={`${code}:${view.pool.window}`}
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
          {view && !closed ? (
            <>
              <Button disabled={busy || resultPending || view.players.length < 2} onClick={() => void start()}>
                {t(view.status === Status.PLAYING.value ? "sealed.private.resume" : "sealed.private.start")}
              </Button>
              <Button variant="secondary" onClick={() => void cancel()}>
                {t("sealed.private.cancel")}
              </Button>
            </>
          ) : null}
          <Button variant="secondary" onClick={closed || !code ? leave : onClose}>
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
