import { useId, useState } from "react";
import { getCardDefinition, type Permanent } from "@aegis/shared";
import { Button } from "../design/primitives";
import { CardFull } from "../design/cards";
import { useTranslation } from "../i18n";
import { CardPromptFrame } from "./overlay/combat/CardPromptFrame";
import type { ProjectedDnaDigivolveRoute } from "./digivolveModel";
import "./DnaMaterialChoiceOverlay.css";

/** The server owns legality; the player chooses which physical stacks to consume. */
export function DnaMaterialChoiceOverlay({
  cardId,
  routes,
  permanents,
  initialMaterialPermanentIds,
  onConfirm,
  onNormalEvolution,
  onCancel,
}: {
  cardId: string;
  routes: readonly ProjectedDnaDigivolveRoute[];
  permanents: readonly Permanent[];
  initialMaterialPermanentIds: readonly string[];
  onConfirm: (materialPermanentIds: string[]) => void;
  onNormalEvolution?: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const groupId = useId();
  const [selectedKey, setSelectedKey] = useState(JSON.stringify(initialMaterialPermanentIds));
  const liveRoutes = routes.filter((route) =>
    route.materialPermanentIds.every((id) => permanents.some((p) => p.permanentId === id && p.topCard)),
  );
  const selected = liveRoutes.find((route) => JSON.stringify(route.materialPermanentIds) === selectedKey);
  return (
    <CardPromptFrame
      surface="center"
      cardId={cardId}
      className="dna-material-choice"
      label={t("overlay.confirmDnaTitle")}
      eyebrow={t("overlay.dnaChooseMaterials")}
      title={t("overlay.confirmDnaTitle")}
      description={t("overlay.dnaChooseMaterials")}
      onBack={onCancel}
    >
      <fieldset className="dna-material-choice__routes">
        <legend>{t("overlay.dnaChooseMaterials")}</legend>
        {liveRoutes.length === 0 ? <p role="status">{t("overlay.dnaUnavailable")}</p> : null}
        {liveRoutes.map((route, index) => {
          const key = JSON.stringify(route.materialPermanentIds);
          return (
            <label className="dna-material-choice__route" key={key}>
              <input type="radio" name={groupId} checked={selectedKey === key} onChange={() => setSelectedKey(key)} />
              <span className="dna-material-choice__pair">
                <strong>{t("overlay.dnaPair", { number: index + 1 })}</strong>
                {route.materialPermanentIds.map((id) => {
                  const permanent = permanents.find((p) => p.permanentId === id)!;
                  const material = permanent.topCard;
                  return (
                    <span className="dna-material-choice__material" key={id}>
                      <CardFull cardId={material.cardId} artId={material.artId} width={48} />
                      <span>
                        {getCardDefinition(material.cardId)?.nameEn ?? material.cardId}
                        <small>{t("overlay.dnaSources", { count: permanent.stack.length })}</small>
                        {permanent.stack.length > 0 ? (
                          <small>
                            {permanent.stack
                              .map((source) => getCardDefinition(source.cardId)?.nameEn ?? source.cardId)
                              .join(" · ")}
                          </small>
                        ) : null}
                        <small>{t(permanent.isSuspended ? "overlay.suspended" : "overlay.unsuspended")}</small>
                      </span>
                    </span>
                  );
                })}
                <small>{t("overlay.appFusionCost", { cost: route.projectedCost })}</small>
              </span>
            </label>
          );
        })}
      </fieldset>
      <div className="game-actions-row">
        <Button full disabled={!selected} onClick={() => selected && onConfirm([...selected.materialPermanentIds])}>
          {t("overlay.confirmDna")}
        </Button>
        {onNormalEvolution ? (
          <Button full variant="secondary" onClick={onNormalEvolution}>
            {t("overlay.digivolveNormally")}
          </Button>
        ) : null}
        <Button full variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </CardPromptFrame>
  );
}
