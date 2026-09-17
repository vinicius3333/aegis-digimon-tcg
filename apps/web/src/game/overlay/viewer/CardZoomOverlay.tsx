import { useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getCardDefinition } from "@aegis/shared";
import { CardFull } from "../../../design/cards";
import { useTranslation } from "../../../i18n";
import { PrintedCardInfo } from "./PrintedCardInfo";

/** Full-screen blow-up of a single card; tap anywhere (or Escape) to dismiss. */
export function CardZoomOverlay({
  cardId,
  artId,
  onClose,
  inline,
  details,
}: {
  cardId: string;
  artId?: string;
  onClose: () => void;
  /** Render in place rather than portalling, so a fixture stage can hold the overlay. */
  inline?: boolean;
  /** Info shown under the card. Defaults to the printed name, level, cost and DP. */
  details?: ReactNode;
}) {
  const { t } = useTranslation();
  const width = useCardZoomWidth();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const panel = (
    <div
      className="card-zoom"
      role="dialog"
      aria-modal="true"
      aria-label={getCardDefinition(cardId)?.nameEn ?? cardId}
      onClick={onClose}
    >
      <CardFull cardId={cardId} artId={artId} width={width} />
      <div className="card-zoom__details card-action-sheet__info" onClick={(e) => e.stopPropagation()}>
        {details ?? <PrintedCardInfo cardId={cardId} />}
      </div>
      <button type="button" onClick={onClose} autoFocus>
        {t("common.close")}
      </button>
    </div>
  );
  return inline ? panel : createPortal(panel, document.body);
}

/**
 * The blow-up fills as much of the viewport as it can while leaving room for the
 * details and the close button below it. Cards are drawn at a 1:1.4 ratio, so the
 * height budget is what usually binds on a laptop and the width on a phone.
 */
const CARD_ZOOM_CHROME_HEIGHT = 220;
const CARD_ZOOM_MAX_WIDTH = 560;
const CARD_ZOOM_MIN_WIDTH = 260;

function useCardZoomWidth() {
  const measure = () =>
    Math.round(
      Math.max(
        CARD_ZOOM_MIN_WIDTH,
        Math.min(CARD_ZOOM_MAX_WIDTH, window.innerWidth * 0.9, (window.innerHeight - CARD_ZOOM_CHROME_HEIGHT) / 1.4),
      ),
    );
  const [width, setWidth] = useState(measure);
  useEffect(() => {
    const onResize = () => setWidth(measure());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}
