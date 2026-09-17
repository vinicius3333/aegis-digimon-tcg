import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button } from "../../../design/primitives";
import { CardFull } from "../../../design/cards";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { Scrim } from "../Scrim";
import type { TurnOrder } from "../types";

export function MulliganOverlay({
  handCardIds,
  turnOrder,
  onKeep,
  onMulligan,
}: {
  handCardIds: string[];
  turnOrder?: TurnOrder;
  onKeep: () => void;
  onMulligan: () => void;
}) {
  const { t } = useTranslation();
  const [isViewingBoard, setIsViewingBoard] = useState(false);

  // The board is behind this overlay, so peeking hides the sheet entirely and
  // leaves only the way back — the same shape DecisionOverlay's board view uses.
  if (isViewingBoard) {
    const returnControl = (
      <div className="decision-board-return mulligan-return">
        <span className="decision-board-return__status" aria-live="polite">
          {t("overlay.awaitingMulligan")}
        </span>
        <Button icon={Icons.ArrowLeft} onClick={() => setIsViewingBoard(false)}>
          {t("overlay.returnToMulligan")}
        </Button>
      </div>
    );
    return typeof document === "undefined" ? returnControl : createPortal(returnControl, document.body);
  }

  return (
    <Scrim className="mulligan-scrim">
      <section className="mulligan-sheet" aria-labelledby="mulligan-title" onClick={(e) => e.stopPropagation()}>
        <Badge className="mulligan-badge" tone="primary">
          <Icons.Dices size={13} />
          {t("overlay.openingHand")}
        </Badge>
        <h2 id="mulligan-title" className="mulligan-title">
          {t("overlay.keepHand")}
        </h2>
        {turnOrder ? (
          <p className="mulligan-turn-order">
            {t(turnOrder === "first" ? "overlay.turnOrderFirst" : "overlay.turnOrderSecond")}
          </p>
        ) : null}
        <p className="mulligan-detail">{t("overlay.mulliganDetail", { count: handCardIds.length })}</p>
        <div className="mulligan-cards" aria-label={t("overlay.openingHand")}>
          {handCardIds.map((id, i) => (
            <div className="mulligan-card" key={`${id}-${i}`} style={{ animationDelay: `${i * 70}ms` }}>
              <CardFull cardId={id} width={190} />
            </div>
          ))}
        </div>
        <div className="mulligan-actions">
          <Button size="lg" icon={Icons.Check} onClick={onKeep}>
            {t("overlay.keep")}
          </Button>
          <Button size="lg" variant="secondary" icon={Icons.Dices} onClick={onMulligan}>
            {t("overlay.mulligan")}
          </Button>
          <Button size="lg" variant="ghost" icon={Icons.Map} onClick={() => setIsViewingBoard(true)}>
            {t("overlay.checkPlayArea")}
          </Button>
        </div>
      </section>
    </Scrim>
  );
}
