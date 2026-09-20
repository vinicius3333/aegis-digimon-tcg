import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { CardArt } from "../CardArt";
import { printedCardName } from "../printedCardName";
import { CardPromptFrame } from "./CardPromptFrame";

export function BlockOverlay({
  attackerCardId,
  blockers,
  mustBlock = false,
  onBlock,
  onDecline,
}: {
  attackerCardId?: string;
  blockers: { permanentId: string; cardId: string; currentDP: number; sourceCount: number }[];
  /** Collision requires blocking while a blocker is available. */
  mustBlock?: boolean;
  onBlock: (permanentId: string) => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  const forced = mustBlock && blockers.length > 0;
  return (
    <CardPromptFrame
      cardId={attackerCardId}
      fallback={<Icons.Swords size={32} />}
      className="block-overlay"
      label={t("overlay.blockWindow")}
      eyebrow={
        <>
          {t("overlay.blockWindow")}
          {forced ? (
            <>
              {" "}
              · <span>{t("overlay.blockForced")}</span>
            </>
          ) : null}
        </>
      }
      title={t("overlay.blockChooseCard")}
      description={t(forced ? "overlay.blockForcedPrompt" : "overlay.blockPrompt")}
    >
      {blockers.length ? (
        <div className="counter-overlay__gallery block-overlay__gallery">
          {blockers.map((blocker) => {
            const sourceLabel = t(blocker.sourceCount === 1 ? "overlay.sourceCountOne" : "overlay.sourceCountMany", {
              count: blocker.sourceCount,
            });
            return (
              <button
                key={blocker.permanentId}
                className="counter-overlay__card"
                aria-label={`${printedCardName(blocker.cardId)}, ${blocker.currentDP.toLocaleString()} DP, ${sourceLabel}`}
                onClick={() => onBlock(blocker.permanentId)}
              >
                <CardArt cardId={blocker.cardId} width={112} />
                <strong>{printedCardName(blocker.cardId)}</strong>
                <span className="counter-overlay__card-id">{blocker.cardId}</span>
                <span className="block-overlay__dp">{blocker.currentDP.toLocaleString()} DP</span>
                <span>{sourceLabel}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p>{t("overlay.noBlockers")}</p>
      )}
      {!forced ? (
        <Button full variant="secondary" icon={Icons.Shield} onClick={onDecline}>
          {t("overlay.takeAttack")}
        </Button>
      ) : null}
    </CardPromptFrame>
  );
}
