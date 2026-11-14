import { findBoosterProduct } from "@aegis/shared/packOpening/findBoosterProduct";
import { getSealedPoolManifest } from "@/sealed/getSealedPoolManifest";
import { useCallback, useEffect, useId, useState } from "react";
import { DeckEditor } from "@/screens/DeckEditor";
import type { DeckListing } from "@/game/decks";
import { validateSealedDeck } from "@aegis/shared/sealed/validateSealedDeck";
import type { SealedOwnPool } from "@aegis/shared/sealed/SealedContracts";
import { Alert, Button } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import type { ApiResult } from "@/tournaments/client";
import type { PrivateSealedReady } from "@aegis/shared/sealed/private/PrivateSealedContracts";
import { useCountdown, usePolledRequest } from "@/tournaments/hooks";
import { serverNow } from "@/tournaments/serverClock";
import { useSealedPackOpeningSource } from "@/sealed/useSealedPackOpeningSource";
import { SealedOpening } from "@/sealed/SealedOpening";
import "@/sealed/sealed.css";

type Props = {
  loadPool: (signal: AbortSignal) => Promise<ApiResult<SealedOwnPool>>;
  readyDeck: (input: PrivateSealedReady) => Promise<ApiResult<SealedOwnPool>>;
  onReady: () => void;
  policy?: string;
  waitingText?: string;
};

export function SealedPoolBuilder({ loadPool, readyDeck, onReady, policy, waitingText }: Props) {
  const { t } = useTranslation();
  const [pool, setPool] = useState<SealedOwnPool>();
  const [loadFailed, setLoadFailed] = useState(false);
  const load = useCallback((signal: AbortSignal) => loadPool(signal), [loadPool]);
  const apply = useCallback((result: Awaited<ReturnType<typeof load>>) => {
    if (result.ok) {
      setPool((previous) => {
        if (previous && previous.window === result.value.window && previous.revision > result.value.revision) {
          return previous;
        }
        return result.value;
      });
      setLoadFailed(false);
    } else {
      setLoadFailed(result.error.status !== 404);
    }
  }, []);
  const { refresh } = usePolledRequest(load, apply, 3000);
  if (!pool) {
    return loadFailed ? (
      <Alert tone="danger">
        {t("sealed.error")}
        <Button onClick={() => void refresh()}>{t("sealed.retry")}</Button>
      </Alert>
    ) : (
      <p role="status">{waitingText ?? t("sealed.private.waiting")}</p>
    );
  }
  return (
    <SealedLoadedPoolBuilder
      key={`${pool.configuration.setId}:${getSealedPoolManifest({ packs: pool.packs })}`}
      pool={pool}
      setPool={setPool}
      refresh={refresh}
      loadFailed={loadFailed}
      readyDeck={readyDeck}
      onReady={onReady}
      policy={policy}
    />
  );
}

type LoadedProps = Pick<Props, "readyDeck" | "onReady" | "policy"> & {
  pool: SealedOwnPool;
  setPool: (pool: SealedOwnPool) => void;
  refresh: () => Promise<unknown>;
  loadFailed: boolean;
};

function SealedLoadedPoolBuilder({ pool, setPool, refresh, loadFailed, readyDeck, onReady, policy }: LoadedProps) {
  const { t } = useTranslation();
  const id = useId();
  const [mainDeck, setMainDeck] = useState<string[]>([]);
  const [eggDeck, setEggDeck] = useState<string[]>([]);
  const [revision, setRevision] = useState(-1);
  const [sourceWindow, setSourceWindow] = useState<SealedOwnPool["window"]>();
  const [serverLocked, setServerLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState(false);
  const source = useSealedPackOpeningSource(pool);
  const countdown = useCountdown(pool.deadlineAt);
  const completed = source.completedAllocation?.length ?? 0;
  const pulls = pool.packs.slice(0, completed).flat();
  const remaining = new Map<string, number>();
  for (const pull of pulls) {
    const printing = pull.artId ?? pull.cardId;
    remaining.set(printing, (remaining.get(printing) ?? 0) + 1);
  }
  function isEligiblePrinting(printing: string) {
    const count = remaining.get(printing) ?? 0;
    if (count === 0) {
      return false;
    }
    remaining.set(printing, count - 1);
    return true;
  }
  const eligibleMain = mainDeck.filter(isEligiblePrinting);
  const eligibleEggs = eggDeck.filter(isEligiblePrinting);
  const poolLocked = pool.ready || !pool.editable || pool.window === null;
  useEffect(() => {
    if (pool && (pool.revision !== revision || pool.window !== sourceWindow || poolLocked !== serverLocked)) {
      setMainDeck(pool.deck?.mainDeck ?? []);
      setEggDeck(pool.deck?.eggDeck ?? []);
      setRevision(pool.revision);
      setSourceWindow(pool.window);
      setServerLocked(poolLocked);
    }
  }, [pool, revision, sourceWindow, poolLocked, serverLocked]);
  if (revision !== pool.revision || pool.window !== sourceWindow || poolLocked !== serverLocked) {
    return loadFailed ? (
      <Alert tone="danger">
        {t("sealed.error")}
        <Button onClick={() => void refresh()}>{t("sealed.retry")}</Button>
      </Alert>
    ) : (
      <p role="status">{t("sealed.private.waiting")}</p>
    );
  }

  const product = findBoosterProduct(pool.configuration.setId);
  const legal = validateSealedDeck({ pool: pulls, mainDeck: eligibleMain, eggDeck: eligibleEggs }).ok;
  const editable = !poolLocked && pool.deadlineAt !== null && serverNow() < pool.deadlineAt;
  async function ready() {
    if (!pool?.window) {
      return;
    }
    setBusy(true);
    setError(false);
    const result = await readyDeck({
      mainDeck: eligibleMain,
      eggDeck: eligibleEggs,
      revision: pool.revision,
      window: pool.window,
    });
    setBusy(false);
    if (result.ok) {
      setPool(result.value);
      onReady();
    } else {
      setError(true);
    }
    void refresh();
  }
  const deck: DeckListing = {
    id: "sealed-pool",
    name: t("sealed.main"),
    color: "Red",
    blurb: "",
    mainDeck: eligibleMain.map((printing) => pulls.find((pull) => (pull.artId ?? pull.cardId) === printing)!.cardId),
    eggDeck: eligibleEggs.map((printing) => pulls.find((pull) => (pull.artId ?? pull.cardId) === printing)!.cardId),
    mainDeckArts: eligibleMain,
    eggDeckArts: eligibleEggs,
  };
  let status = t("sealed.locked");
  if (busy) {
    status = t("sealed.saving");
  } else if (pool.ready) {
    status = t("sealed.ready");
  } else if (pool.deadlineAt !== null && serverNow() >= pool.deadlineAt) {
    status = t("sealed.expired");
  } else if (editable) {
    status = t("sealed.building");
  }
  const readyAction = (
    <Button disabled={!editable || busy || !legal} onClick={() => void ready()}>
      {busy ? t("sealed.saving") : t("sealed.submit")}
    </Button>
  );
  const footer = (
    <>
      <p role="status">{status}</p>
      <p aria-live="polite">
        {t("sealed.remaining", { count: Math.max(0, 40 - eligibleMain.length) })} · {t("sealed.sideboard")}{" "}
        {pulls.length - eligibleMain.length - eligibleEggs.length}
      </p>
      {readyAction}
    </>
  );
  const editor =
    completed > 0 ? (
      <DeckEditor
        key={`${pool.window}:${revision}:${serverLocked}:${completed}`}
        deck={deck}
        boundedPool={{ pulls, disabled: !editable || busy, footer, primaryAction: readyAction }}
        onSave={(next) => {
          setMainDeck(next.mainDeckArts ?? next.mainDeck);
          setEggDeck(next.eggDeckArts ?? next.eggDeck);
        }}
        onClose={() => undefined}
        onNav={() => undefined}
      />
    ) : null;
  return (
    <section className="sealed-builder" aria-labelledby={`${id}-title`}>
      <header className="sealed-builder__header">
        <div>
          <span className="sealed-eyebrow">
            {product?.label ?? pool.configuration.setId} · {pool.configuration.packs} ×{" "}
            {product?.cardsPerPack ?? pool.packs[0]?.length ?? 0}
          </span>
          <h4 id={`${id}-title`}>{t("sealed.title")}</h4>
          <p role="status">{t("sealed.openProgress", { opened: completed, total: pool.packs.length })}</p>
          {!editable || busy || pool.ready ? (
            <p className="sealed-builder__status" role="status" aria-label={status}>
              {status}
            </p>
          ) : null}
        </div>
        {pool.deadlineAt ? (
          <time dateTime={new Date(pool.deadlineAt).toISOString()} title={new Date(pool.deadlineAt).toLocaleString()}>
            {t("sealed.deadline")} {countdown.text}
          </time>
        ) : null}
        <Button variant="secondary" onClick={() => setOpening((value) => !value)}>
          {t("sealed.open")}
        </Button>
        <details>
          <summary>{t("sealed.rules")}</summary>
          <p>{policy ?? t("sealed.private.policy")}</p>
        </details>
      </header>
      {error || loadFailed ? <Alert tone="danger">{t("sealed.error")}</Alert> : null}
      {opening ? <SealedOpening source={source} onClose={() => setOpening(false)} /> : editor}
    </section>
  );
}
