import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { CardLinkedText } from "../../cardLinks";
import { printedCardName } from "../printedCardName";

export function BarrierOverlay({
  permanentId,
  getCardId,
  onAccept,
  onDecline,
}: {
  permanentId: string;
  getCardId: (permanentId: string) => string | undefined;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  const cardId = getCardId(permanentId);
  return (
    <div
      className="combat-prompt"
      style={{
        position: "absolute",
        left: "50%",
        bottom: 232,
        transform: "translateX(-50%)",
        zIndex: 80,
        width: 400,
        background: "var(--ds-surface)",
        border: "2px solid var(--ds-warning)",
        borderRadius: 18,
        boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        padding: 20,
        animation: "battle-dialog-in 200ms ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "var(--ds-warning-surface)",
            color: "var(--ds-warning)",
          }}
        >
          <Icons.Shield size={18} />
        </span>
        <div>
          <div style={{ fontFamily: "var(--ds-font-display)", fontWeight: 700, fontSize: 17, color: "var(--ds-fg)" }}>
            ＜Barrier＞
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ds-fg-muted)" }}>
            {cardId ? (
              <CardLinkedText
                text={t("overlay.wouldBeDeleted", { name: printedCardName(cardId) })}
                cardIds={[cardId]}
              />
            ) : (
              t("overlay.wouldBeDeleted", { name: t("overlay.yourDigimon") })
            )}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ds-fg-secondary)", marginBottom: 18, lineHeight: 1.5 }}>
        {cardId ? (
          <CardLinkedText text={t("overlay.barrierPrompt", { name: printedCardName(cardId) })} cardIds={[cardId]} />
        ) : (
          t("overlay.barrierPrompt", { name: t("overlay.thisDigimon") })
        )}
      </div>
      <div className="game-actions-row">
        <Button full icon={Icons.Shield} onClick={onAccept}>
          {t("overlay.trashSecurity")}
        </Button>
        <Button full variant="secondary" onClick={onDecline}>
          {t("overlay.letDeleted")}
        </Button>
      </div>
    </div>
  );
}
