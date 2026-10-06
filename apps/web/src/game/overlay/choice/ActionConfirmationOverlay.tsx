import { Button } from "../../../design/primitives";
import { CardFull } from "../../../design/cards";
import { useTranslation } from "../../../i18n";
import { useEffectPromptFocus } from "./useEffectPromptFocus";
import { useBoardPreview } from "./useBoardPreview";
import { DecisionViewBoardButton } from "./DecisionViewBoardButton";
import "../effectPromptFamily.css";

export function ActionConfirmationOverlay({
  cardId,
  title,
  detail,
  showSummary = true,
  confirmLabel,
  alternateLabel,
  onConfirm,
  onAlternate,
  onCancel,
}: {
  cardId: string;
  title: string;
  detail: string;
  showSummary?: boolean;
  confirmLabel: string;
  alternateLabel?: string;
  onConfirm: () => void;
  onAlternate?: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { isViewingBoard, openBoard, boardReturn } = useBoardPreview();
  const focusProps = useEffectPromptFocus(isViewingBoard);
  if (isViewingBoard) return boardReturn;
  return (
    <div className="effect-prompt-layer" onClick={(event) => event.stopPropagation()}>
      <div className="decision-overlay-backdrop decision-overlay-backdrop--side" aria-hidden="true" />
      <div
        {...focusProps}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-summary={showSummary || undefined}
        className="game-modal__panel action-confirmation effect-prompt-family"
        data-prompt-surface="left"
      >
        {showSummary ? (
          <div className="action-confirmation__header">
            <span className="mobile-prompt-art">
              <CardFull cardId={cardId} width={72} zoomOnHover={false} />
            </span>
            <div className="action-confirmation__copy">
              <h2 className="action-confirmation__title">{title}</h2>
              <p className="action-confirmation__detail">{detail}</p>
            </div>
          </div>
        ) : (
          <h2 className="action-confirmation__title">{confirmLabel}</h2>
        )}
        <div className="game-actions-row">
          <Button full onClick={onConfirm}>
            {confirmLabel}
          </Button>
          {alternateLabel && onAlternate ? (
            <Button full variant="secondary" onClick={onAlternate}>
              {alternateLabel}
            </Button>
          ) : null}
          <Button full variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
        <div className="effect-prompt-family__board-action">
          <DecisionViewBoardButton onOpenBoard={openBoard} />
        </div>
      </div>
    </div>
  );
}
