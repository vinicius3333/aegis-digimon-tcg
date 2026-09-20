import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { CardArt } from "../CardArt";
import { printedCardName } from "../printedCardName";
import { CardPromptFrame } from "./CardPromptFrame";
import "../effectPromptFamily.css";

/** Alliance suspends one other eligible Digimon, adding its current DP to the attacker. */
export function AllianceOverlay({
  triggerCardId,
  allies,
  onChoose,
  onPass,
}: {
  triggerCardId?: string;
  allies: { permanentId: string; cardId: string; currentDP: number; sourceCount: number }[];
  onChoose: (allyPermanentId: string) => void;
  onPass: () => void;
}) {
  const { t } = useTranslation();
  return (
    <CardPromptFrame
      cardId={triggerCardId}
      fallback={<Icons.Users size={28} />}
      eyebrow="＜Alliance＞"
      title={t("overlay.allianceWindow")}
      description={t("overlay.alliancePrompt")}
      className="alliance-overlay"
    >
      {allies.length ? (
        <div className="counter-overlay__gallery alliance-overlay__choices">
          {allies.map((ally) => {
            const sourceLabel = t(ally.sourceCount === 1 ? "overlay.sourceCountOne" : "overlay.sourceCountMany", {
              count: ally.sourceCount,
            });
            return (
              <button
                type="button"
                className="counter-overlay__card"
                key={ally.permanentId}
                onClick={() => onChoose(ally.permanentId)}
                aria-label={`${t("overlay.suspendAlly", { name: printedCardName(ally.cardId), dp: ally.currentDP.toLocaleString() })}, ${sourceLabel}`}
              >
                <CardArt cardId={ally.cardId} width={104} />
                <strong>{printedCardName(ally.cardId)}</strong>
                <span className="counter-overlay__card-id">{ally.cardId}</span>
                <span className="alliance-overlay__stats">
                  +{ally.currentDP.toLocaleString()} DP · {sourceLabel}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="alliance-overlay__empty">{t("overlay.noAllies")}</p>
      )}
      <Button full variant="secondary" icon={Icons.ChevronRight} onClick={onPass}>
        {t("overlay.passAlliance")}
      </Button>
    </CardPromptFrame>
  );
}
