import { useEffect, useId, useRef, useState } from "react";
import { getCardDefinition } from "@aegis/shared";
import { Button, Dialog } from "../design/primitives";
import { CardFull } from "../design/cards";
import { useTranslation } from "../i18n";
import "./AppFusionChoiceOverlay.css";

export interface AppFusionRoute {
  linkedInstanceId: string;
  linkedCardId: string;
  projectedCost: number;
}

export interface AppFusionChoiceOverlayProps {
  resultCardId: string;
  hostCardId: string;
  routes: readonly AppFusionRoute[];
  onConfirm: (linkedInstanceId: string) => void;
  onNormalEvolution?: () => void;
  onCancel: () => void;
}

/** Controlled confirmation surface for a server-projected App Fusion route. */
export function AppFusionChoiceOverlay({
  resultCardId,
  hostCardId,
  routes,
  onConfirm,
  onNormalEvolution,
  onCancel,
}: AppFusionChoiceOverlayProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(routes[0]?.linkedInstanceId ?? null);
  const selected = routes.find((route) => route.linkedInstanceId === selectedId);

  useEffect(() => {
    initialFocusRef.current?.focus();
  }, []);

  useEffect(() => {
    if (selectedId !== null && !routes.some((route) => route.linkedInstanceId === selectedId)) {
      setSelectedId(null);
    }
  }, [routes, selectedId]);

  const resultName = getCardDefinition(resultCardId)?.nameEn ?? resultCardId;
  const hostName = getCardDefinition(hostCardId)?.nameEn ?? hostCardId;

  return (
    <Dialog className="app-fusion-choice" labelledBy={titleId} onClose={onCancel}>
      <section className="action-confirmation app-fusion-choice__panel">
        <div className="app-fusion-choice__heading">
          <CardFull cardId={resultCardId} width={64} />
          <div>
            <h2 id={titleId}>{t("overlay.appFusionTitle")}</h2>
            <p>{t("overlay.appFusionDetail", { result: resultName, host: hostName })}</p>
          </div>
        </div>
        <fieldset className="app-fusion-choice__routes">
          <legend>{t("overlay.appFusionMaterial")}</legend>
          {routes.length === 0 ? <p role="status">{t("overlay.appFusionUnavailable")}</p> : null}
          {routes.map((route, index) => {
            const id = `${titleId}-material-${route.linkedInstanceId}`;
            return (
              <label className="app-fusion-choice__route" htmlFor={id} key={route.linkedInstanceId}>
                <input
                  ref={index === 0 ? initialFocusRef : undefined}
                  id={id}
                  type="radio"
                  name={`${titleId}-material`}
                  value={route.linkedInstanceId}
                  checked={selectedId === route.linkedInstanceId}
                  onChange={() => setSelectedId(route.linkedInstanceId)}
                />
                <CardFull cardId={route.linkedCardId} width={58} />
                <span>
                  {getCardDefinition(route.linkedCardId)?.nameEn ?? route.linkedCardId}
                  <small>{t("overlay.appFusionCost", { cost: route.projectedCost })}</small>
                </span>
              </label>
            );
          })}
        </fieldset>
        <div className="game-actions-row">
          <Button
            full
            disabled={selected === undefined}
            onClick={() => selected && onConfirm(selected.linkedInstanceId)}
          >
            {t("overlay.appFusionConfirm")}
          </Button>
          {onNormalEvolution ? (
            <Button full variant="secondary" onClick={onNormalEvolution}>
              {t("overlay.appFusionNormal")}
            </Button>
          ) : null}
          <Button full variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </section>
    </Dialog>
  );
}
