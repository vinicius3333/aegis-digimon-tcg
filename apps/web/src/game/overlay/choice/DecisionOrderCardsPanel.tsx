import { CardFull } from "../../../design/cards";
import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { CardLink } from "../../cardLinks";
import { printedCardName } from "../printedCardName";
import { orderHintKey } from "./decisionOrderHints";
import type { DecisionCandidate } from "./decisionTypes";

/** The reorder list body for an `orderCards` decision, one row per candidate in its current slot. */
export function DecisionOrderCardsPanel({
  candidates,
  cardOrder,
  wideDialog,
  orderDestination,
  onMove,
}: {
  candidates: readonly DecisionCandidate[];
  cardOrder: readonly string[];
  wideDialog: boolean;
  orderDestination: string | undefined;
  onMove: (index: number, delta: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, color: "var(--ds-fg-secondary)", marginBottom: 10 }}>
        {t(orderHintKey(orderDestination))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cardOrder.map((instanceId, index) => {
          const card = candidates.find((candidate) => candidate.instanceId === instanceId);
          return (
            <div
              key={instanceId}
              className="decision-overlay__order-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 8,
                borderRadius: 12,
                background: "var(--ds-surface-muted)",
                animation: "aegis-rise 160ms ease-out",
              }}
            >
              <div className="decision-overlay__order-card">
                <CardFull cardId={card?.cardId ?? ""} artId={card?.artId} width={wideDialog ? 86 : 62} />
                <span className="decision-overlay__order-badge" aria-hidden="true">
                  {index + 1}
                </span>
              </div>
              <span style={{ flex: 1, fontWeight: 600 }}>
                <CardLink cardId={card?.cardId} />
              </span>
              <Button
                variant="ghost"
                disabled={index === 0}
                onClick={() => onMove(index, -1)}
                aria-label={`${t("overlay.moveUp")}, ${card?.cardId ? printedCardName(card.cardId) : t("overlay.card")}, ${index + 1}`}
              >
                <Icons.ChevronUp size={18} />
              </Button>
              <Button
                variant="ghost"
                disabled={index === cardOrder.length - 1}
                onClick={() => onMove(index, 1)}
                aria-label={`${t("overlay.moveDown")}, ${card?.cardId ? printedCardName(card.cardId) : t("overlay.card")}, ${index + 1}`}
              >
                <Icons.ChevronDown size={18} />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
